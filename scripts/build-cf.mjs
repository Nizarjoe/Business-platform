// Build cf-dist/_worker.js for Cloudflare Pages: server.js + public/ embedded.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const assets = {};
for (const name of fs.readdirSync('public')) {
  const buf = fs.readFileSync(path.join('public', name));
  assets['/' + name] = { type: TYPES[path.extname(name).toLowerCase()] || 'application/octet-stream', b64: buf.toString('base64') };
}
if (!assets['/index.html']) throw new Error('public/index.html missing');
fs.writeFileSync('cf/assets.generated.mjs', 'export default ' + JSON.stringify(assets) + ';\n');

fs.rmSync('cf-dist', { recursive: true, force: true });
fs.rmSync('cf/.bundle', { recursive: true, force: true });
execFileSync('npx', ['wrangler', 'deploy', '--dry-run', '--config', 'cf/wrangler.bundle.toml', '--outdir', '.bundle', '--minify'], { stdio: 'inherit' });
const out = fs.readdirSync('cf/.bundle').filter(n => n.endsWith('.js'));
if (out.length !== 1 || !out[0].endsWith('.js')) throw new Error('expected one bundled module, got ' + out.join(','));
fs.mkdirSync('cf-dist');
fs.copyFileSync(path.join('cf/.bundle', out[0]), 'cf-dist/_worker.js');
console.log('worker bytes', fs.statSync('cf-dist/_worker.js').size);

// F8: scheduled backup Worker (deployed separately, see README "Backup otomatis").
fs.rmSync('cf/.bundle-backup', { recursive: true, force: true });
fs.rmSync('cf-dist-backup', { recursive: true, force: true });
execFileSync('npx', ['wrangler', 'deploy', '--dry-run', '--config', 'cf/wrangler.backup.toml', '--outdir', '.bundle-backup'], { stdio: 'inherit' });
const bout = fs.readdirSync('cf/.bundle-backup').filter(n => n.endsWith('.js'));
if (bout.length !== 1) throw new Error('expected one backup worker module, got ' + bout.join(','));
fs.mkdirSync('cf-dist-backup');
fs.copyFileSync(path.join('cf/.bundle-backup', bout[0]), 'cf-dist-backup/worker.js');
console.log('backup worker bytes', fs.statSync('cf-dist-backup/worker.js').size);
