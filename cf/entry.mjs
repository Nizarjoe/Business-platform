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

export default {
  async fetch(request, ...rest) {
    const res = await handler.fetch(request, ...rest);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
    return out;
  }
};
