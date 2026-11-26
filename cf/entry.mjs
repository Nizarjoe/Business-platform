// Cloudflare Pages (advanced mode) entry. Bundled by scripts/build-cf.mjs into
// cf-dist/_worker.js together with every file in public/.
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import ASSETS from './assets.generated.mjs';
// pdfkit's Workers build ships no font files; register the two server.js uses.
import { registerStdFonts } from 'pdfkit';
import Helvetica from 'pdfkit/standard-fonts/Helvetica';
import HelveticaBold from 'pdfkit/standard-fonts/HelveticaBold';

registerStdFonts(Helvetica, HelveticaBold);

globalThis.__CF_ENV = env;
globalThis.__PUBLIC_ASSETS = ASSETS;
process.env.PORT = '3000';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
};

const require_ = (await import('./require-server.cjs')).default;
require_();
const handler = httpServerHandler({ port: 3000 });

// Documentation media (server.js /api/projects/:id/media/:mid/raw): Express has
// already checked the session and project access and answers with an empty body
// plus X-BP-Stream = [{k: KV key, s, e}] (byte offsets, e exclusive). The bytes are
// streamed here one KV chunk at a time. The header is never sent to the browser.
function streamed(request, res) {
  const plan = res.headers.get('x-bp-stream');
  if (!plan) return null;
  const segs = JSON.parse(plan);
  const headers = new Headers(res.headers);
  headers.delete('x-bp-stream');
  headers.set('content-length', headers.get('x-bp-length') || '0');
  headers.delete('x-bp-length');
  headers.delete('transfer-encoding');
  if (request.method === 'HEAD') return new Response(null, { status: res.status, headers });
  let i = 0;
  const body = new ReadableStream({
    async pull(ctrl) {
      if (i >= segs.length) { ctrl.close(); return; }
      const g = segs[i++];
      const buf = await env.FILES.get(g.k, 'arrayBuffer');
      if (!buf || buf.byteLength < g.e) { ctrl.error(new Error('media chunk missing: ' + g.k)); return; }
      ctrl.enqueue(new Uint8Array(buf, g.s, g.e - g.s));
    }
  });
  return new Response(body, { status: res.status, headers });
}

export default {
  async fetch(request, ...rest) {
    const res = await handler.fetch(request, ...rest);
    const out = streamed(request, res) || new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
    return out;
  }
};
