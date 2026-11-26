const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfkit = require('pdfkit');
// Node build exports the class; the Workers (browser) build is an ES module.
const PDFDocument = pdfkit.default || pdfkit;
const {
  load, update, loadDoc, updateDoc, readOrSeed,
  uploadObject, removeStored, usingRemote, usingCloudflare, getObject, initPersistence,
  createSession, getSession, deleteSession, deleteUserSessions, rateHit, rateGet, rateClear,
  addAudit, listAudit, storageInfo, cfEnv,
  UPLOADS_DIR, DATA_DIR, ADMIN_WA
} = require('./db');
const { xlsx } = require('./xlsx');
const auth = require('./auth');
const backup = require('./backup');

const app = express();
const PORT = process.env.PORT || 3000;
// Local mode only: created lazily on first disk write. In remote (Supabase)
// mode photos go to Storage, so a read-only FS must not crash startup.
const ensureUploadsDir = () => { try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { console.error('uploads dir:', e.message); } };
if (!usingRemote()) ensureUploadsDir();
const QRIS_IMG = process.env.QRIS_FILE
  ? path.resolve(process.env.QRIS_FILE)
  : path.join(__dirname, 'public', 'qris.jpg');

const storage = usingRemote()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOADS_DIR),
      filename: (req, file, cb) => {
        const uniq = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, `${req.params.id || 'x'}-${uniq}${path.extname(file.originalname)}`);
      }
    });
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.disable('x-powered-by');
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  // index.html uses inline scripts and handlers, so 'unsafe-inline' stays until GIBRAN splits them out.
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src https://www.openstreetmap.org; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"
};
app.use((req, res, next) => { res.set(SECURITY_HEADERS); if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: '5mb' }));

/* ================= SESSION + ACCESS (F1) =================
   Every /api route needs a session except login and health. Roles come from
   the users document on the server; the browser never names its own role. */
const ROLES = ['superadmin', 'admin', 'anggota', 'medsos', 'customer'];
const ALL = ROLES;
const SA = ['superadmin'];
const MGR = ['superadmin', 'admin'];
const WORK = ['superadmin', 'admin', 'anggota'];
const STAFF = ['superadmin', 'admin', 'anggota', 'medsos'];
const CONTENT = ['superadmin', 'admin', 'medsos'];
const FIN = MGR; // Kas: not anggota, medsos, customer (S6)
const ACCESS = [
  ['POST', /^\/api\/login$/, null],
  ['GET', /^\/api\/health$/, null],
  ['POST', /^\/api\/logout$/, ALL],
  ['GET', /^\/api\/me$/, ALL],
  ['POST', /^\/api\/me\/password$/, ALL],
  ['GET', /^\/api\/users$/, SA],
  ['POST', /^\/api\/users$/, SA],
  ['DELETE', /^\/api\/users\/[^/]+$/, SA],
  ['PUT', /^\/api\/users\/[^/]+\/password$/, SA],
  ['GET', /^\/api\/admin\//, SA],
  ['GET', /^\/api\/audit$/, SA],
  ['*', /^\/api\/backups(\/|$)/, SA],
  ['GET', /^\/api\/projects$/, ALL],
  ['POST', /^\/api\/projects$/, WORK],
  ['PUT', /^\/api\/projects\/[^/]+$/, WORK],
  ['PUT', /^\/api\/projects\/[^/]+\/customers$/, MGR],
  ['DELETE', /^\/api\/projects\/[^/]+$/, MGR],
  ['*', /^\/api\/projects\/[^/]+\/photo$/, WORK],
  ['*', /^\/api\/transactions(\/|$)/, FIN],
  ['GET', /^\/api\/stats$/, STAFF],
  // Customers may download the nota of a project linked to them (checked in the route).
  ['GET', /^\/api\/pdf\/project\/[^/]+$/, [...WORK, 'customer']],
  // F7: payments change money, so superadmin only (like bayar); invoices for Kas roles and the linked customer.
  ['*', /^\/api\/projects\/[^/]+\/payments(\/|$)/, SA],
  ['GET', /^\/api\/pdf\/invoice\/[^/]+\/[^/]+$/, [...FIN, 'customer']],
  // F14: attachments for the people who work on the project.
  ['*', /^\/api\/projects\/[^/]+\/files(\/|$)/, WORK],
  ['GET', /^\/api\/reminders$/, STAFF],
  ['GET', /^\/api\/reports\//, FIN],
  ['GET', /^\/api\/pdf\//, FIN],
  ['GET', /^\/api\/export\//, FIN],
  ['POST', /^\/api\/send-wa$/, WORK],
  ['GET', /^\/api\/send-wa\/outbox$/, FIN],
  ['*', /^\/api\/plans(\/|$)/, CONTENT],
  ['GET', /^\/api\/(qris|paymeta)$/, ALL],
  // Payment details customers pay to: superadmin only (assumption P12).
  ['*', /^\/api\/(qris|qris\/image|paymeta)$/, SA]
];
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const isSecure = req => usingCloudflare() || req.secure || req.get('x-forwarded-proto') === 'https';

function sameOrigin(req) {
  const origin = req.get('origin');
  const host = req.get('host');
  if (!host) return false;
  const allowed = [`https://${host}`, `http://${host}`];
  if (origin) return allowed.includes(origin);
  const ref = req.get('referer');
  if (ref) { try { return allowed.includes(new URL(ref).origin); } catch (e) { return false; } }
  return false;
}

async function sessionUser(req) {
  const token = auth.readCookie(req.get('cookie'));
  if (!token) return null;
  const th = await auth.tokenHash(token);
  const s = await getSession(th);
  if (!s) return null;
  const u = (await getUsers()).find(x => x.username === s.username);
  if (!u) { await deleteSession(th); return null; }
  return { username: u.username, role: u.role, tokenHash: th };
}

async function gate(req, res, next, roles) {
  try {
    if (UNSAFE.has(req.method) && !sameOrigin(req)) return res.status(403).json({ error: 'Origin tidak diizinkan' });
    if (roles === null) return next();
    const user = await sessionUser(req);
    if (!user) return res.status(401).json({ error: 'Silakan login dulu' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Tidak punya akses' });
    req.user = user;
    next();
  } catch (e) { next(e); }
}

app.use('/api', (req, res, next) => {
  const p = req.baseUrl + req.path;
  const rule = ACCESS.find(([m, re]) => (m === '*' || m === req.method || (m === 'GET' && req.method === 'HEAD')) && re.test(p));
  // Unknown endpoints still need a session; they end in the 404 handler.
  return gate(req, res, next, rule ? rule[2] : ALL);
});
// Uploaded photos are client data: logged-in staff and customers only.
const filesGate = (req, res, next) => gate(req, res, next, ALL);

// Replaced QRIS images live in Storage when Supabase is configured. The page
// still requests /qris.jpg, so serve that URL from the stored public object.
app.get('/qris.jpg', async (req, res, next) => {
  try {
    if (usingRemote()) {
      const meta = await loadDoc('qris-meta');
      const stored = meta && meta.imageUrl && usingCloudflare() ? await getObject(meta.imageUrl) : null;
      if (stored) {
        res.set('Content-Type', stored.contentType);
        res.set('Cache-Control', 'no-store');
        res.send(stored.body);
        return;
      }
      if (meta && meta.imageUrl && !usingCloudflare()) {
        const r = await fetch(meta.imageUrl);
        if (r.ok) {
          res.set('Content-Type', r.headers.get('content-type') || 'image/jpeg');
          res.set('Cache-Control', 'no-store');
          res.send(Buffer.from(await r.arrayBuffer()));
          return;
        }
      }
    } else if (process.env.QRIS_FILE && fs.existsSync(QRIS_IMG)) {
      res.set('Cache-Control', 'no-store');
      res.type(path.extname(QRIS_IMG) === '.png' ? 'png' : 'jpeg');
      res.send(fs.readFileSync(QRIS_IMG));
      return;
    }
    next();
  } catch (e) {
    next();
  }
});

// Cloudflare Pages has no filesystem: cf/entry.mjs embeds public/ as
// globalThis.__PUBLIC_ASSETS ({ '/index.html': { type, b64 } }) and KV holds uploads.
const EMBEDDED = globalThis.__PUBLIC_ASSETS || null;
const publicFile = name => EMBEDDED
  ? (EMBEDDED['/' + name] ? Buffer.from(EMBEDDED['/' + name].b64, 'base64') : null)
  : path.join(__dirname, 'public', name);
if (EMBEDDED) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const a = EMBEDDED[req.path === '/' ? '/index.html' : req.path];
    if (!a) return next();
    res.set('Content-Type', a.type);
    if (a.type.startsWith('text/html')) res.set('Cache-Control', 'no-cache');
    res.send(Buffer.from(a.b64, 'base64'));
  });
  app.get(/^\/files\/.+/, filesGate, async (req, res) => {
    // Attachments (F14) are only served through the per-project route, which checks access.
    if (/^\/files\/docs(\/|%2f)/i.test(req.path)) return res.status(404).send('Not found');
    const stored = await getObject(req.path);
    if (!stored) return res.status(404).send('Not found');
    res.set('Content-Type', stored.contentType);
    res.set('Cache-Control', 'private, max-age=300');
    res.send(stored.body);
  });
}
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', filesGate, express.static(UPLOADS_DIR));

// Magic bytes, so a renamed file cannot pass as an image or PDF (F3, F14).
function sniffType(buf) {
  if (!buf || buf.length < 4) return null;
  const b = buf;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  if (b.length >= 12 && b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'application/zip';
  return null;
}

function safeExt(name) {
  const ext = path.extname(name || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'].includes(ext) ? ext : '.jpg';
}
function safeId(id) {
  return String(id || 'x').replace(/[^A-Za-z0-9_-]/g, '') || 'x';
}

const rupiah = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const DAY = 86400000;
const addPeriode = (dstr, num, unit) => {
  const d = new Date(dstr + 'T00:00:00');
  if (unit === 'hari') d.setDate(d.getDate() + num);
  if (unit === 'minggu') d.setDate(d.getDate() + num * 7);
  if (unit === 'bulan') d.setMonth(d.getMonth() + num);
  if (unit === 'tahun') d.setFullYear(d.getFullYear() + num);
  return d.toISOString().slice(0, 10);
};

/* ================= AUTH ================= */
function userSeed() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    { username: 'superadmin', role: 'superadmin', created: today },
    { username: 'admin', role: 'admin', created: today }
  ];
}
const getUsers = () => readOrSeed('users', userSeed);

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_USER = 8;
const LOGIN_MAX_PER_IP = 30;
const clientIp = req => req.get('cf-connecting-ip') || req.ip || 'unknown';

// Never log req.body here: it holds the password.
app.post('/api/login', async (req, res) => {
  const b = req.body || {};
  const name = String(b.username || '').trim().toLowerCase().slice(0, 64);
  const password = typeof b.password === 'string' ? b.password : '';
  const ipKey = 'login:ip:' + clientIp(req);
  const userKey = 'login:user:' + name;
  // Only failed attempts count, so a busy office behind one IP is not locked out.
  const [ip, per] = await Promise.all([rateGet(ipKey), rateGet(userKey)]);
  if (ip.count >= LOGIN_MAX_PER_IP || per.count >= LOGIN_MAX_PER_USER) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((Math.max(ip.resetAt, per.resetAt) - Date.now()) / 1000))));
    return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' });
  }
  const users = await getUsers();
  const u = users.find(x => x.username.toLowerCase() === name);
  let ok = false;
  if (u && !u.pass && u.role === 'superadmin' && process.env.BP_PASS_SUPERADMIN) {
    // First login of the built-in superadmin on a server that was given an
    // initial password; store its hash so the env value is no longer needed.
    ok = !!password && await auth.sameSecret(password, process.env.BP_PASS_SUPERADMIN);
    if (ok) {
      const rec = await auth.hashPassword(password);
      await updateDoc('users', userSeed, us => { const t = us.find(x => x.username === u.username); if (t && !t.pass) t.pass = rec; return us; });
    }
  } else {
    ok = await auth.verifyPassword(password, u && u.pass);
  }
  if (!ok) {
    await Promise.all([rateHit(ipKey, LOGIN_WINDOW_MS), rateHit(userKey, LOGIN_WINDOW_MS)]);
    if (u && !u.pass) return res.status(401).json({ error: 'Password akun ini belum diatur. Minta superadmin mengaturnya.' });
    return res.status(401).json({ error: 'Username atau password salah' });
  }
  await rateClear(userKey);
  const token = auth.newToken();
  await createSession(await auth.tokenHash(token), u.username, Date.now() + auth.SESSION_TTL_MS);
  res.set('Cache-Control', 'no-store');
  res.append('Set-Cookie', auth.sessionCookie(token, isSecure(req)));
  res.json({ ok: true, username: u.username, role: u.role });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
// Storage layout and the S7 migration report (counts + SHA-256 per document).
app.get('/api/admin/storage', async (req, res) => res.json(await storageInfo()));

app.post('/api/logout', async (req, res) => {
  await deleteSession(req.user.tokenHash);
  res.append('Set-Cookie', auth.clearCookie(isSecure(req)));
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ username: req.user.username, role: req.user.role });
});

/* F3: changing where customers send money needs the actor's password again
   (a stolen session alone is not enough), and every change is written to the
   audit log with the values before and after. Wrong passwords count toward a
   per-user limit like login. */
const CONFIRM_MAX = 8;
async function confirmPassword(req, res) {
  const key = 'confirm:user:' + req.user.username;
  const r = await rateGet(key);
  if (r.count >= CONFIRM_MAX) { res.status(429).json({ error: 'Terlalu banyak konfirmasi salah. Coba lagi beberapa menit lagi.' }); return false; }
  const pw = (req.body || {}).confirmPassword;
  const me = (await getUsers()).find(x => x.username === req.user.username);
  if (!me || !(await auth.verifyPassword(typeof pw === 'string' ? pw : '', me.pass))) {
    await rateHit(key, LOGIN_WINDOW_MS);
    res.status(403).json({ error: 'Konfirmasi password salah', needPassword: true });
    return false;
  }
  await rateClear(key);
  return true;
}
const audit = (req, action, target, detail) => addAudit({ actor: req.user.username, action, target, detail: { ...detail, ip: clientIp(req) } });
/* F8: backups live in the BACKUPS KV namespace (Cloudflare only). The cron
   Worker cf/backup-worker.mjs writes one every night; superadmin can make one
   now and download any of the last 14 days. */
const backupEnv = () => { const env = cfEnv(); return env && env.BACKUPS ? env : null; };
const noBackups = res => res.status(501).json({ error: 'Backup otomatis hanya tersedia di Cloudflare (binding BACKUPS)' });
app.get('/api/backups', async (req, res) => {
  const env = backupEnv(); if (!env) return noBackups(res);
  res.json(await backup.listBackups(env.BACKUPS));
});
app.post('/api/backups', async (req, res) => {
  const env = backupEnv(); if (!env) return noBackups(res);
  const r = await backup.runBackup(env.DB, env.BACKUPS, 'manual ' + req.user.username);
  await audit(req, 'backup.run', r.key, { after: { counts: r.counts, bytes: r.bytes } });
  res.json(r);
});
app.get('/api/backups/:name', async (req, res) => {
  const env = backupEnv(); if (!env) return noBackups(res);
  if (!backup.validKey(req.params.name)) return res.status(400).json({ error: 'Nama backup tidak valid' });
  const body = await env.BACKUPS.get(backup.PREFIX + req.params.name, 'text');
  if (body === null) return res.status(404).json({ error: 'Backup tidak ditemukan' });
  await audit(req, 'backup.download', req.params.name, {});
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="business-platform-${req.params.name}"`);
  res.send(body);
});
app.get('/api/audit', async (req, res) => res.json(await listAudit(Math.min(Number(req.query.limit) || 200, 500))));

async function setPassword(username, password) {
  const rec = await auth.hashPassword(password);
  let found = false;
  await updateDoc('users', userSeed, us => {
    const t = us.find(x => x.username === username);
    if (t) { t.pass = rec; found = true; }
    return us;
  });
  return found;
}

// Change your own password: needs the current one; other sessions are ended.
app.post('/api/me/password', async (req, res) => {
  const { current, next } = req.body || {};
  const problem = auth.passwordProblem(next);
  if (problem) return res.status(400).json({ error: problem });
  const me = (await getUsers()).find(x => x.username === req.user.username);
  if (!me || !(await auth.verifyPassword(typeof current === 'string' ? current : '', me.pass)))
    return res.status(403).json({ error: 'Password lama salah' });
  await setPassword(me.username, next);
  await deleteUserSessions(me.username, req.user.tokenHash);
  res.json({ ok: true });
});

// Superadmin sets (or resets) another user's password; that user's sessions end.
app.put('/api/users/:username/password', async (req, res) => {
  const name = String(req.params.username || '').toLowerCase();
  const problem = auth.passwordProblem((req.body || {}).password);
  if (problem) return res.status(400).json({ error: problem });
  if (!(await setPassword(name, req.body.password))) return res.status(404).json({ error: 'User tidak ditemukan' });
  await deleteUserSessions(name, name === req.user.username ? req.user.tokenHash : '');
  res.json({ ok: true });
});

app.get('/api/users', async (req, res) => res.json((await getUsers()).map(({ username, role, created, pass }) => ({ username, role, created, hasPassword: !!pass }))));
app.post('/api/users', async (req, res) => {
  const { username, role } = req.body || {};
  const name = String(username || '').trim().toLowerCase();
  if (!name) return res.status(400).json({ error: 'Username wajib diisi' });
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(name)) return res.status(400).json({ error: 'Username 2-32 karakter: huruf kecil, angka, titik, minus, garis bawah' });
  let forbidden = false, conflict = false, created = null;
  await updateDoc('users', userSeed, (us) => {
    if (us.find(x => x.username === name)) { conflict = true; return us; }
    created = { username: name, role: ['superadmin','admin','anggota','medsos','customer'].includes(role) ? role : 'anggota', created: new Date().toISOString().slice(0, 10) };
    us.push(created);
    return us;
  });
  if (forbidden) return res.status(403).json({ error: 'Hanya superadmin bisa menambah user' });
  if (conflict) return res.status(409).json({ error: 'Username sudah dipakai' });
  res.json(created);
});
app.delete('/api/users/:username', async (req, res) => {
  const name = req.params.username.toLowerCase();
  if (name === 'superadmin') return res.status(400).json({ error: 'Superadmin utama tidak boleh dihapus' });
  let forbidden = false, missing = false;
  await updateDoc('users', userSeed, (us) => {
    if (!us.find(x => x.username === name)) { missing = true; return us; }
    return us.filter(x => x.username !== name);
  });
  if (!missing) {
    await deleteUserSessions(name, '');
    // A later account with the same name must not inherit this customer's projects.
    await update(db => { db.projects.forEach(p => { if (Array.isArray(p.customers) && p.customers.includes(name)) p.customers = p.customers.filter(x => x !== name); }); });
  }
  if (forbidden) return res.status(403).json({ error: 'Hanya superadmin bisa hapus user' });
  if (missing) return res.status(404).json({ error: 'User tidak ditemukan' });
  res.json({ ok: true });
});

/* ================= PROJECTS ================= */
// Who sees which project (F2, S5, P13):
//  customer -> only projects whose `customers` list holds their username;
//  anggota  -> projects whose PIC equals their username, or that they created;
//  superadmin, admin, medsos -> all.
// Hidden projects answer 404 so their IDs do not leak.
const lc = v => String(v || '').trim().toLowerCase();
function canSeeProject(user, p) {
  if (!user || !p) return false;
  if (user.role === 'customer') return Array.isArray(p.customers) && p.customers.includes(user.username);
  if (user.role === 'anggota') return lc(p.pic) === user.username || p.createdBy === user.username;
  return true;
}
const visibleProjects = (user, list) => list.filter(p => canSeeProject(user, p));
// Customers get their own project's progress and bill only: no phone numbers,
// photos, signatures, technician notes, or the list of linked accounts.
const CUSTOMER_FIELDS = ['id', 'tgl', 'nama', 'layanan', 'pic', 'status', 'bayar', 'biaya', 'diagnosis', 'output', 'garansiNum', 'garansiUnit', 'garansiAkhir'];
const customerView = p => ({
  ...Object.fromEntries(CUSTOMER_FIELDS.map(k => [k, p[k]])),
  pembayaran: (p.pembayaran || []).map(({ id, no, tgl, jenis, nominal }) => ({ id, no, tgl, jenis, nominal }))
});
const paidOf = p => (p.pembayaran || []).reduce((s, x) => s + Number(x.nominal || 0), 0);

// Returns { list } or { error }. Only accounts with role customer can be linked.
async function checkCustomers(value) {
  if (!Array.isArray(value)) return { error: 'customers harus berupa daftar username' };
  const users = await getUsers();
  const names = [...new Set(value.map(lc).filter(Boolean))];
  const bad = names.filter(n => !users.some(u => u.username === n && u.role === 'customer'));
  if (bad.length) return { error: 'Bukan akun customer: ' + bad.join(', ') };
  return { list: names };
}
const sameList = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

/* Server-side search (F6/F10). Every filter is optional; values are exact
   except q (case-insensitive substring) and dari/sampai (inclusive dates).
   limit/offset page the result; X-Total-Count carries the full match count. */
const qs = v => (Array.isArray(v) ? String(v[0] || '') : String(v || '')).trim();
const PROJECT_TEXT = ['id', 'nama', 'klien', 'wa', 'pic', 'layanan', 'input', 'output', 'diagnosis'];
function filterProjects(list, q) {
  const text = lc(qs(q.q)), status = qs(q.status), bayar = qs(q.bayar), layanan = qs(q.layanan), pic = lc(qs(q.pic));
  const dari = qs(q.dari), sampai = qs(q.sampai);
  return list.filter(p =>
    (!text || PROJECT_TEXT.some(f => lc(p[f]).includes(text))) &&
    (!status || p.status === status) && (!bayar || p.bayar === bayar) && (!layanan || p.layanan === layanan) &&
    (!pic || lc(p.pic) === pic) && (!dari || String(p.tgl || '') >= dari) && (!sampai || String(p.tgl || '') <= sampai));
}
const TRX_TEXT = ['id', 'kategori', 'pic', 'ket', 'jenis'];
function filterTransactions(list, q) {
  const text = lc(qs(q.q)), jenis = qs(q.jenis), kategori = qs(q.kategori), dari = qs(q.dari), sampai = qs(q.sampai);
  return list.filter(t =>
    (!text || TRX_TEXT.some(f => lc(t[f]).includes(text))) && (!jenis || t.jenis === jenis) &&
    (!kategori || t.kategori === kategori) && (!dari || t.tgl >= dari) && (!sampai || t.tgl <= sampai));
}
function pageOf(res, list, q) {
  res.set('X-Total-Count', String(list.length));
  const limit = Math.min(Math.max(parseInt(qs(q.limit), 10) || 0, 0), 1000);
  const offset = Math.max(parseInt(qs(q.offset), 10) || 0, 0);
  return limit ? list.slice(offset, offset + limit) : list.slice(offset);
}

app.get('/api/projects', async (req, res) => {
  const db = await load();
  const list = filterProjects(visibleProjects(req.user, db.projects), req.query).sort((a, b) => b.id.localeCompare(a.id));
  const out = pageOf(res, list, req.query);
  const noUrls = p => (p.lampiran ? { ...p, lampiran: p.lampiran.map(({ url, ...rest }) => rest) } : p);
  res.json(req.user.role === 'customer' ? out.map(customerView) : out.map(noUrls));
});

// Superadmin/admin link customer accounts to a project.
app.put('/api/projects/:id/customers', async (req, res) => {
  const checked = await checkCustomers((req.body || {}).customers);
  if (checked.error) return res.status(400).json({ error: checked.error });
  let missing = false;
  const p = await update(db => {
    const project = db.projects.find(x => x.id === req.params.id);
    if (!project) { missing = true; return null; }
    project.customers = checked.list;
    return project;
  });
  if (missing) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  res.json({ id: p.id, customers: p.customers });
});

app.post('/api/projects', async (req, res) => {
  const b = req.body || {};
  if (!b.nama || !b.layanan || !b.pic) return res.status(400).json({ error: 'Nama, layanan, dan PIC wajib diisi' });
  if (b.bayar && b.bayar !== 'Belum Bayar' && req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Status bayar hanya bisa diubah superadmin' });
  let customers = [];
  if (b.customers !== undefined && !(Array.isArray(b.customers) && !b.customers.length)) {
    if (!MGR.includes(req.user.role)) return res.status(403).json({ error: 'Hanya superadmin/admin bisa menautkan customer' });
    const checked = await checkCustomers(b.customers);
    if (checked.error) return res.status(400).json({ error: checked.error });
    customers = checked.list;
  }
  const p = await update(db => {
    const tgl = new Date().toISOString().slice(0, 10);
    const project = {
      id: 'KDS-' + String(db.counters.project++).padStart(3, '0'),
      tgl, nama: b.nama, layanan: b.layanan,
      pic: b.pic, klien: b.klien || '-', wa: (b.wa || '').replace(/\D/g, ''),
      biaya: Number(b.biaya || 0), bayar: b.bayar || 'Belum Bayar', status: b.status || 'Baru Masuk',
      input: b.input || '', output: b.output || '',
      diagnosis: b.diagnosis || '', reportTeknisi: b.reportTeknisi || '',
      garansiNum: Number(b.garansiNum || 0), garansiUnit: b.garansiUnit || 'bulan', garansiAkhir: '',
      signature: b.signature || null,
      fotoIn: [], fotoOut: [],
      customers, createdBy: req.user.username
    };
    if (project.status === 'Selesai / Closing' && project.garansiNum > 0)
      project.garansiAkhir = addPeriode(tgl, project.garansiNum, project.garansiUnit);
    db.projects.push(project);
    return project;
  });
  res.json(p);
});

app.put('/api/projects/:id', async (req, res) => {
  let missing = false, bayarDenied = false, linkDenied = false, bayarFrom;
  const body = { ...(req.body || {}) };
  delete body.id; delete body.fotoIn; delete body.fotoOut; delete body.createdBy;
  if (body.customers !== undefined) {
    const checked = await checkCustomers(body.customers);
    if (checked.error) return res.status(400).json({ error: checked.error });
    body.customers = checked.list;
  }
  const p = await update(db => {
    const project = db.projects.find(x => x.id === req.params.id);
    if (!project || !canSeeProject(req.user, project)) { missing = true; return null; }
    if (body.bayar !== undefined && body.bayar !== project.bayar && req.user.role !== 'superadmin') { bayarDenied = true; return null; }
    if (body.customers !== undefined && !sameList(body.customers, project.customers) && !MGR.includes(req.user.role)) { linkDenied = true; return null; }
    const prevBayar = project.bayar, prevStatus = project.status;
    bayarFrom = prevBayar;
    Object.assign(project, body);
    project.biaya = Number(project.biaya || 0);
    project.garansiNum = Number(project.garansiNum || 0);
    // garansi mulai berlalu saat closing
    if (project.status === 'Selesai / Closing' && prevStatus !== 'Selesai / Closing' && project.garansiNum > 0 && !project.garansiAkhir)
      project.garansiAkhir = addPeriode(new Date().toISOString().slice(0, 10), project.garansiNum, project.garansiUnit);
    if (project.status !== 'Selesai / Closing') project.garansiAkhir = '';
    // Recorded payments (F7) already created their Kas rows: book only what is left.
    const rest = project.biaya - paidOf(project);
    if (prevBayar !== 'Lunas' && project.bayar === 'Lunas' && rest > 0) {
      db.transactions.push({
        id: 'TRX-' + String(db.counters.trx++).padStart(3, '0'),
        tgl: new Date().toISOString().slice(0, 10),
        jenis: 'Uang Masuk',
        kategori: project.layanan === 'DLL' ? 'DLL' : project.layanan,
        nominal: rest, pic: project.pic,
        ket: `Pembayaran lunas ${project.id} — ${project.nama}`
      });
    }
    return project;
  });
  if (bayarDenied) return res.status(403).json({ error: 'Status bayar hanya bisa diubah superadmin' });
  if (linkDenied) return res.status(403).json({ error: 'Hanya superadmin/admin bisa menautkan customer' });
  if (missing) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  if (bayarFrom !== undefined && bayarFrom !== p.bayar) await audit(req, 'project.bayar', p.id, { before: bayarFrom, after: p.bayar });
  res.json(p);
});

app.delete('/api/projects/:id', async (req, res) => {
  let missing = false;
  await update(db => {
    const i = db.projects.findIndex(x => x.id === req.params.id);
    if (i < 0) { missing = true; return; }
    db.projects.splice(i, 1);
  });
  if (missing) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  res.json({ ok: true });
});

app.delete('/api/projects/:id/photo', async (req, res) => {
  const url = String(req.query.url || '');
  const kind = req.query.kind === 'out' ? 'fotoOut' : 'fotoIn';
  let missing = false;
  await update(db => {
    const p = db.projects.find(x => x.id === req.params.id);
    if (!p || !canSeeProject(req.user, p)) { missing = true; return; }
    p[kind] = (p[kind] || []).filter(u => u !== url);
  });
  if (missing) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  await removeStored(url);
  res.json({ ok: true });
});

app.post('/api/projects/:id/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
  const kind = req.query.kind === 'out' ? 'fotoOut' : 'fotoIn';
  if (!canSeeProject(req.user, (await load()).projects.find(x => x.id === req.params.id))) {
    if (!usingRemote() && req.file.filename) await removeStored('/uploads/' + req.file.filename);
    return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  }
  let url;
  if (usingRemote()) {
    const objectPath = `photos/${safeId(req.params.id)}-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt(req.file.originalname)}`;
    url = await uploadObject(objectPath, req.file.buffer, req.file.mimetype || 'application/octet-stream');
  } else {
    url = '/uploads/' + req.file.filename;
  }
  let missing = false;
  await update(db => {
    const p = db.projects.find(x => x.id === req.params.id);
    if (!p || !canSeeProject(req.user, p)) { missing = true; return; }
    if (!Array.isArray(p[kind])) p[kind] = [];
    p[kind].push(url);
  });
  if (missing) {
    await removeStored(url);
    return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  }
  res.json({ url, kind });
});

/* ================= TRANSACTIONS ================= */
app.get('/api/transactions', async (req, res) => {
  const db = await load();
  res.json(pageOf(res, filterTransactions(db.transactions.slice().reverse(), req.query), req.query));
});
app.post('/api/transactions', async (req, res) => {
  const { tgl, jenis, kategori, nominal, pic, ket } = req.body || {};
  if (!jenis || !nominal) return res.status(400).json({ error: 'Jenis dan nominal wajib' });
  const t = await update(db => {
    const trx = {
      id: 'TRX-' + String(db.counters.trx++).padStart(3, '0'),
      tgl: tgl || new Date().toISOString().slice(0, 10),
      jenis, kategori: kategori || 'Operasional',
      nominal: Number(nominal), pic: pic || '-', ket: ket || ''
    };
    db.transactions.push(trx);
    return trx;
  });
  res.json(t);
});
app.delete('/api/transactions/:id', async (req, res) => {
  let missing = false;
  await update(db => {
    const i = db.transactions.findIndex(x => x.id === req.params.id);
    if (i < 0) { missing = true; return; }
    db.transactions.splice(i, 1);
  });
  if (missing) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json({ ok: true });
});

/* ================= F7: PEMBAYARAN BERTAHAP + INVOICE ================= */
// Each payment gets an invoice number INV-YYYYMM-NNNN, a Kas row (Uang Masuk),
// and moves bayar to DP or Lunas. Superadmin only, like bayar itself.
const PAY_JENIS = ['DP', 'Termin', 'Pelunasan'];
const today = () => new Date().toISOString().slice(0, 10);
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const bayarFor = p => { const s = paidOf(p); return s <= 0 ? 'Belum Bayar' : s >= p.biaya ? 'Lunas' : 'DP'; };

app.post('/api/projects/:id/payments', async (req, res) => {
  const b = req.body || {};
  const nominal = Math.round(Number(b.nominal));
  if (!PAY_JENIS.includes(b.jenis)) return res.status(400).json({ error: 'Jenis harus DP, Termin, atau Pelunasan' });
  if (!(nominal > 0)) return res.status(400).json({ error: 'Nominal harus lebih dari 0' });
  const tgl = isDate(b.tgl) ? b.tgl : today();
  let missing = false, over = false;
  const r = await update(db => {
    const p = db.projects.find(x => x.id === req.params.id);
    if (!p) { missing = true; return null; }
    if (paidOf(p) + nominal > p.biaya) { over = true; return null; }
    db.counters.invoice = db.counters.invoice || 1;
    const no = 'INV-' + tgl.slice(0, 7).replace('-', '') + '-' + String(db.counters.invoice++).padStart(4, '0');
    const trxId = 'TRX-' + String(db.counters.trx++).padStart(3, '0');
    db.transactions.push({ id: trxId, tgl, jenis: 'Uang Masuk', kategori: p.layanan === 'DLL' ? 'DLL' : p.layanan, nominal, pic: p.pic, ket: `${b.jenis} ${no} ${p.id} — ${p.nama}` });
    const pay = { id: 'PAY-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), no, tgl, jenis: b.jenis, nominal, ket: String(b.ket || '').slice(0, 200), trxId, oleh: req.user.username };
    const before = p.bayar;
    p.pembayaran = [...(p.pembayaran || []), pay];
    p.bayar = bayarFor(p);
    return { pay, before, bayar: p.bayar, terbayar: paidOf(p), sisa: p.biaya - paidOf(p) };
  });
  if (missing) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  if (over) return res.status(400).json({ error: 'Total pembayaran melebihi biaya proyek' });
  await audit(req, 'project.payment', req.params.id, { before: r.before, after: { bayar: r.bayar, invoice: r.pay.no, nominal: r.pay.nominal, jenis: r.pay.jenis } });
  res.json(r);
});

app.delete('/api/projects/:id/payments/:pid', async (req, res) => {
  let missing = false;
  const r = await update(db => {
    const p = db.projects.find(x => x.id === req.params.id);
    const pay = p && (p.pembayaran || []).find(x => x.id === req.params.pid);
    if (!pay) { missing = true; return null; }
    const before = p.bayar;
    p.pembayaran = p.pembayaran.filter(x => x !== pay);
    db.transactions = db.transactions.filter(t => t.id !== pay.trxId);
    p.bayar = bayarFor(p);
    return { pay, before, bayar: p.bayar };
  });
  if (missing) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
  await audit(req, 'project.payment.delete', req.params.id, { before: { bayar: r.before, invoice: r.pay.no, nominal: r.pay.nominal }, after: { bayar: r.bayar } });
  res.json({ ok: true, bayar: r.bayar });
});

app.get('/api/pdf/invoice/:id/:pid', async (req, res) => {
  const db = await load();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p || !canSeeProject(req.user, p)) return res.status(404).json({ error: 'not found' });
  const list = p.pembayaran || [];
  const i = list.findIndex(x => x.id === req.params.pid);
  if (i < 0) return res.status(404).json({ error: 'not found' });
  const pay = list[i];
  const upTo = list.slice(0, i + 1).reduce((s, x) => s + x.nominal, 0);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pay.no}.pdf"`);
  doc.pipe(res);
  kop(doc, `INVOICE / KUITANSI — ${pay.no}`);
  [['Nomor Invoice', pay.no], ['Tanggal Bayar', pay.tgl], ['Jenis Pembayaran', pay.jenis],
   ['Proyek', `${p.id} — ${p.nama}`], ['Layanan', p.layanan], ['Klien', p.klien || '-'],
   ['Nominal Dibayar', rupiah(pay.nominal)], ['Total Biaya Proyek', rupiah(p.biaya)],
   ['Total Terbayar s.d. invoice ini', rupiah(upTo)], ['Sisa Tagihan', rupiah(Math.max(0, p.biaya - upTo))],
   ['Keterangan', pay.ket || '-']].forEach(([k, v]) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#7a4b8f').text(k, 50, doc.y + 4, { width: 190 });
    doc.font('Helvetica').fontSize(10).fillColor(C.ink).text(String(v), 250, doc.y, { width: 295 });
    doc.moveDown(0.5);
  });
  doc.moveDown(1);
  doc.roundedRect(50, doc.y, 495, 30, 8).fill(upTo >= p.biaya ? C.greenSoft : C.blueSoft);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink).text(upTo >= p.biaya ? 'STATUS: LUNAS' : `STATUS: ${pay.jenis.toUpperCase()} — sisa ${rupiah(p.biaya - upTo)}`, 62, doc.y + 10);
  footerNote(doc); doc.end();
});

/* ================= F9: PENGINGAT (dashboard only, nothing is sent) ================= */
app.get('/api/reminders', async (req, res) => {
  const t = today(), in14 = addDays(t, 14), in3 = addDays(t, 3);
  const db = await load();
  const ps = visibleProjects(req.user, db.projects);
  const fin = FIN.includes(req.user.role);
  const items = [];
  for (const p of ps) {
    if (p.status === 'Selesai / Closing' && p.garansiAkhir && p.garansiAkhir >= t && p.garansiAkhir <= in14)
      items.push({ type: 'garansi', id: p.id, date: p.garansiAkhir, text: `Garansi ${p.id} — ${p.nama} berakhir ${p.garansiAkhir}` });
    if (p.bayar !== 'Lunas' && ['Selesai / Closing', 'Menunggu Pembayaran'].includes(p.status))
      items.push({ type: 'tagihan', id: p.id, date: p.tgl, text: `Tagihan ${p.id} — ${p.nama} belum lunas` + (fin ? ` (sisa ${rupiah(p.biaya - paidOf(p))})` : '') });
  }
  if (CONTENT.includes(req.user.role)) {
    for (const c of await getPlans()) {
      if (c.status !== 'Tayang' && c.tanggal <= in3)
        items.push({ type: 'konten', id: c.id, date: c.tanggal, text: `${c.tanggal < t ? 'Terlewat' : 'Segera tayang'}: ${c.judul} (${c.tanggal}, ${c.status})` });
      if (c.status === 'Review' && MGR.includes(req.user.role))
        items.push({ type: 'persetujuan', id: c.id, date: c.tanggal, text: `Menunggu persetujuan: ${c.judul} (${c.tanggal})` });
    }
  }
  items.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  res.json(items);
});

/* ================= F12: LAPORAN LABA ================= */
// Per Kas category (Hardware/Software/DLL are the services, so their row is the
// service profit) and per PIC from project values and recorded payments.
function profitReport(db, q) {
  const dari = isDate(q.dari) ? q.dari : '', sampai = isDate(q.sampai) ? q.sampai : '';
  const inRange = d => (!dari || d >= dari) && (!sampai || d <= sampai);
  const kat = {};
  for (const t of db.transactions.filter(x => inRange(x.tgl))) {
    const k = kat[t.kategori] = kat[t.kategori] || { kategori: t.kategori, masuk: 0, keluar: 0 };
    if (t.jenis === 'Uang Masuk') k.masuk += t.nominal; else k.keluar += t.nominal;
  }
  ['Hardware', 'Software', 'DLL'].forEach(l => { kat[l] = kat[l] || { kategori: l, masuk: 0, keluar: 0 }; });
  const perKategori = Object.values(kat).map(k => ({ ...k, laba: k.masuk - k.keluar, layanan: ['Hardware', 'Software', 'DLL'].includes(k.kategori) }))
    .sort((a, b) => (b.layanan - a.layanan) || a.kategori.localeCompare(b.kategori));
  const pic = {};
  for (const p of db.projects.filter(x => inRange(x.tgl))) {
    const r = pic[p.pic] = pic[p.pic] || { pic: p.pic, proyek: 0, nilai: 0, terbayar: 0 };
    r.proyek++; r.nilai += p.biaya;
    r.terbayar += p.bayar === 'Lunas' ? p.biaya : paidOf(p);
  }
  const perPic = Object.values(pic).map(r => ({ ...r, piutang: r.nilai - r.terbayar })).sort((a, b) => b.nilai - a.nilai);
  const masuk = perKategori.reduce((s, k) => s + k.masuk, 0), keluar = perKategori.reduce((s, k) => s + k.keluar, 0);
  return { dari, sampai, perKategori, perPic, total: { masuk, keluar, laba: masuk - keluar } };
}
app.get('/api/reports/profit', async (req, res) => res.json(profitReport(await load(), req.query)));

/* ================= F13: EXPORT EXCEL ================= */
const sendXlsx = (res, filename, sheet, headers, rows) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(xlsx(sheet, headers, rows));
};
app.get('/api/export/projects.xlsx', async (req, res) => {
  const db = await load();
  sendXlsx(res, 'Kudostack-Proyek.xlsx', 'Proyek',
    ['ID', 'Tanggal', 'Nama Proyek', 'Layanan', 'PIC', 'Klien', 'No WA', 'Biaya', 'Terbayar', 'Status Bayar', 'Status Pengerjaan', 'Input dari Klien', 'Diagnosis Awal', 'Output / Hasil', 'Laporan Teknisi', 'Garansi', 'Garansi s.d.', 'Akun Customer'],
    db.projects.map(p => [p.id, p.tgl, p.nama, p.layanan, p.pic, p.klien, p.wa, p.biaya, p.bayar === 'Lunas' ? p.biaya : paidOf(p), p.bayar, p.status,
      p.input, p.diagnosis, p.output, p.reportTeknisi, p.garansiNum ? `${p.garansiNum} ${p.garansiUnit}` : '', p.garansiAkhir, (p.customers || []).join(', ')]));
});
app.get('/api/export/transactions.xlsx', async (req, res) => {
  const db = await load();
  sendXlsx(res, 'Kudostack-Keuangan.xlsx', 'Keuangan', ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'PIC', 'Keterangan'],
    filterTransactions(db.transactions.slice().sort((a, b) => a.tgl.localeCompare(b.tgl)), req.query).map(t => [t.id, t.tgl, t.jenis, t.kategori, t.nominal, t.pic, t.ket]));
});

/* ================= F14: LAMPIRAN DOKUMEN ================= */
// Stored outside the public photo paths: KV "docs/..." (never served by /files),
// Supabase Storage, or DATA_DIR/docs locally. Served only through the project
// route after the session and project-access checks, as an attachment.
const docUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const OFFICE = { '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const SNIFF_EXT = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const LOCAL_DOCS = () => path.join(DATA_DIR, 'docs');
function docType(buf, name) {
  const t = sniffType(buf);
  if (SNIFF_EXT[t]) return { type: t, ext: SNIFF_EXT[t] };
  const ext = path.extname(name || '').toLowerCase();
  if (t === 'application/zip' && OFFICE[ext]) return { type: OFFICE[ext], ext };
  return null;
}
const cleanName = n => String(path.basename(String(n || 'dokumen'))).replace(/[\u0000-\u001f"\\/]/g, '').slice(0, 120) || 'dokumen';

app.post('/api/projects/:id/files', docUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
  const db0 = await load();
  if (!canSeeProject(req.user, db0.projects.find(x => x.id === req.params.id))) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  const kind = docType(req.file.buffer, req.file.originalname);
  if (!kind) return res.status(400).json({ error: 'Hanya PDF, JPG, PNG, WEBP, DOCX, XLSX, PPTX (isi file dicek)' });
  const fid = 'DOC-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let url;
  if (usingRemote()) url = await uploadObject(`docs/${safeId(req.params.id)}/${fid}${kind.ext}`, req.file.buffer, kind.type);
  else {
    fs.mkdirSync(LOCAL_DOCS(), { recursive: true });
    fs.writeFileSync(path.join(LOCAL_DOCS(), fid + kind.ext), req.file.buffer);
    url = 'local-doc:' + fid + kind.ext;
  }
  const item = { id: fid, name: cleanName(req.file.originalname), type: kind.type, size: req.file.size, url, by: req.user.username, at: new Date().toISOString() };
  let missing = false;
  await update(db => {
    const p = db.projects.find(x => x.id === req.params.id);
    if (!p || !canSeeProject(req.user, p)) { missing = true; return; }
    p.lampiran = [...(p.lampiran || []), item];
  });
  if (missing) { await removeDoc(url); return res.status(404).json({ error: 'Proyek tidak ditemukan' }); }
  const { url: _hidden, ...pub } = item;
  res.json(pub);
});

async function removeDoc(url) {
  if (String(url).startsWith('local-doc:')) {
    const f = path.join(LOCAL_DOCS(), path.basename(url.slice('local-doc:'.length)));
    try { fs.unlinkSync(f); } catch (e) {}
    return;
  }
  await removeStored(url);
}
async function readDoc(url) {
  if (String(url).startsWith('local-doc:')) {
    const f = path.join(LOCAL_DOCS(), path.basename(url.slice('local-doc:'.length)));
    return fs.existsSync(f) ? fs.readFileSync(f) : null;
  }
  if (usingCloudflare()) { const o = await getObject(url); return o ? o.body : null; }
  const r = await fetch(url);
  return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
}

app.get('/api/projects/:id/files/:fid', async (req, res) => {
  const p = (await load()).projects.find(x => x.id === req.params.id);
  const item = p && canSeeProject(req.user, p) && (p.lampiran || []).find(x => x.id === req.params.fid);
  if (!item) return res.status(404).json({ error: 'Lampiran tidak ditemukan' });
  const body = await readDoc(item.url);
  if (!body) return res.status(404).json({ error: 'File tidak ada di penyimpanan' });
  res.set('Content-Type', item.type);
  res.set('Content-Disposition', `attachment; filename="${item.name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(item.name)}`);
  res.set('Content-Security-Policy', 'sandbox');
  res.send(body);
});

app.delete('/api/projects/:id/files/:fid', async (req, res) => {
  let gone = null;
  await update(db => {
    const p = db.projects.find(x => x.id === req.params.id);
    if (!p || !canSeeProject(req.user, p)) return;
    gone = (p.lampiran || []).find(x => x.id === req.params.fid) || null;
    if (gone) p.lampiran = p.lampiran.filter(x => x !== gone);
  });
  if (!gone) return res.status(404).json({ error: 'Lampiran tidak ditemukan' });
  await removeDoc(gone.url);
  res.json({ ok: true });
});

/* ================= STATS (+ omzet + chart series) ================= */
app.get('/api/stats', async (req, res) => {
  const db = await load();
  const ps = visibleProjects(req.user, db.projects), trx = db.transactions;
  const inSum = trx.filter(t => t.jenis === 'Uang Masuk').reduce((s, t) => s + t.nominal, 0);
  const outSum = trx.filter(t => t.jenis === 'Uang Keluar').reduce((s, t) => s + t.nominal, 0);
  const byLayanan = l => {
    const list = ps.filter(p => p.layanan === l);
    return { total: list.length, aktif: list.filter(p => p.status !== 'Selesai / Closing').length, omzet: list.filter(p => p.bayar === 'Lunas').reduce((s, p) => s + p.biaya, 0) };
  };
  // series 6 bulan terakhir
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const mtrx = trx.filter(t => t.tgl.startsWith(key));
    months.push({
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      masuk: mtrx.filter(t => t.jenis === 'Uang Masuk').reduce((s, t) => s + t.nominal, 0),
      keluar: mtrx.filter(t => t.jenis === 'Uang Keluar').reduce((s, t) => s + t.nominal, 0)
    });
  }
  const statusCount = {};
  ['Baru Masuk', 'Sedang Dikerjakan', 'Menunggu Pembayaran', 'Selesai / Closing', 'Komplain / Kendala'].forEach(s => statusCount[s] = ps.filter(p => p.status === s).length);
  res.json({
    aktif: ps.filter(p => ['Baru Masuk', 'Sedang Dikerjakan'].includes(p.status)).length,
    tungguBayar: ps.filter(p => p.status === 'Menunggu Pembayaran' || (p.bayar !== 'Lunas' && p.status !== 'Komplain / Kendala' && p.status !== 'Selesai / Closing')).length,
    selesai: ps.filter(p => p.status === 'Selesai / Closing').length,
    komplain: ps.filter(p => p.status === 'Komplain / Kendala').length,
    // Kas figures only for roles that may open Kas (S6).
    finance: FIN.includes(req.user.role),
    uangMasuk: FIN.includes(req.user.role) ? inSum : null,
    uangKeluar: FIN.includes(req.user.role) ? outSum : null,
    saldo: FIN.includes(req.user.role) ? inSum - outSum : null,
    omzet: ps.filter(p => p.bayar === 'Lunas').reduce((s, p) => s + p.biaya, 0),
    piutang: ps.filter(p => p.bayar !== 'Lunas').reduce((s, p) => s + p.biaya, 0),
    layanan: { Hardware: byLayanan('Hardware'), Software: byLayanan('Software'), DLL: byLayanan('DLL') },
    statusCount, months: FIN.includes(req.user.role) ? months : []
  });
});

/* ================= PDF — COLORFUL ================= */
const C = { ink: '#111111', yellow: '#ffd60a', pink: '#ff8ac2', pinkSoft: '#ffe1ef', blue: '#4facfe', blueSoft: '#e2f2ff', green: '#2ed573', greenSoft: '#e2f9ec', red: '#ff4757', purple: '#a55eea', gray: '#666666' };

function kop(doc, title) {
  const w = doc.page.width - 100;
  // header band
  doc.rect(50, 40, w, 74).fill(C.yellow);
  doc.rect(50, 40, 8, 74).fill(C.pink);
  try {
    doc.image(publicFile('logo.jpg'), 62, 47, { fit: [150, 60] });
  } catch (e) {}
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.ink).text('KUDOSTACK', 225, 55);
  doc.fontSize(9).font('Helvetica').fillColor('#444').text('OFFICIAL REPORT — Kontak Admin: ' + ADMIN_WA, 225, 83);
  doc.rect(50, 122, w, 26).fill(C.pink);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#fff').text(title, 60, 129, { width: w - 20, align: 'center' });
  doc.y = 165; doc.x = 50;
}

function chipRow(doc, items, y) {
  let x = 50;
  items.forEach(([label, val, color]) => {
    const tw = doc.widthOfString(label + ': ' + val) + 20;
    if (x + tw > 545) { x = 50; y += 34; }
    doc.roundedRect(x, y, tw, 26, 8).fill(color);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink).text(label + ': ', x + 8, y + 9, { continued: true }).fillColor(C.ink).text(val);
    x += tw + 8;
  });
  return y + 40;
}

function colorfulTable(doc, headers, rows, colw, startX = 50) {
  let y = doc.y;
  const drawHead = yy => {
    let x = startX;
    doc.rect(startX, yy, colw.reduce((a, b) => a + b, 0), 20).fill(C.blue);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fff');
    headers.forEach((h, i) => { doc.text(h, x + 3, yy + 6, { width: colw[i] - 6 }); x += colw[i]; });
    return yy + 20;
  };
  y = drawHead(y);
  rows.forEach((r, ri) => {
    // ukur tinggi baris dari teks terpanjang dulu (pass pengukuran)
    let rowH = 16;
    doc.font('Helvetica').fontSize(8);
    r.forEach((cell, i) => {
      const txt = String(cell && cell._t !== undefined ? cell._t : (cell ?? ''));
      const h = doc.heightOfString(txt, { width: colw[i] - 6 }) + 6;
      if (h > rowH) rowH = h;
    });
    if (y + rowH > 750) { doc.addPage(); y = drawHead(60); }
    let x = startX;
    if (ri % 2 === 0) doc.rect(startX, y, colw.reduce((a, b) => a + b, 0), rowH).fill('#fff7fc');
    r.forEach((cell, i) => {
      if (cell && cell._color) doc.fillColor(cell._color); else doc.fillColor(C.ink);
      doc.font('Helvetica').fontSize(8);
      doc.text(String(cell._t !== undefined ? cell._t : cell), x + 3, y + 3, { width: colw[i] - 6, lineBreak: true });
      x += colw[i];
    });
    y += rowH;
  });
  doc.y = y + 8; doc.x = startX;
  doc.moveTo(startX, y).lineTo(startX + colw.reduce((a, b) => a + b, 0), y).lineWidth(1.5).strokeColor(C.pink).stroke();
}

const money = v => ({ _t: rupiah(v), _color: C.ink });
const colored = (t, c) => ({ _t: t, _color: c });

function footerNote(doc) {
  doc.rect(0, doc.page.height - 42, doc.page.width, 42).fill(C.pinkSoft);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink)
    .text(`KUDOSTACK — Dokumen resmi diterbitkan otomatis oleh Kudostack Admin Hub. Kontak Admin: ${ADMIN_WA}`,
      50, doc.page.height - 28, { width: doc.page.width - 100, align: 'center' });
}

function garansiText(p) {
  if (!p.garansiNum) return 'Tidak ada garansi';
  let s = `${p.garansiNum} ${p.garansiUnit}`;
  if (p.garansiAkhir) s += ` (berlaku s.d. ${p.garansiAkhir})`;
  return s;
}

async function resolveImage(src) {
  if (!src || typeof src !== 'string') return null;
  try {
    if (/^https?:\/\//i.test(src)) {
      const r = await fetch(src);
      if (!r.ok) return null;
      return Buffer.from(await r.arrayBuffer());
    }
    if (usingCloudflare()) {
      const stored = await getObject(src);
      return stored ? stored.body : null;
    }
    if (!src.startsWith('/uploads/')) return null;
    const abs = path.resolve(UPLOADS_DIR, path.basename(src));
    const root = path.resolve(UPLOADS_DIR) + path.sep;
    if (!abs.startsWith(root) || !fs.existsSync(abs)) return null;
    return fs.readFileSync(abs);
  } catch (e) {
    return null;
  }
}

async function prefetchImages(urls) {
  const map = new Map();
  for (const u of urls) {
    if (!u || map.has(u)) continue;
    map.set(u, await resolveImage(u));
  }
  return map;
}

function paint(doc, map, src, x, y, fit) {
  const buf = map.get(src);
  if (!buf) return;
  try { doc.image(buf, x, y, { fit }); } catch (e) {}
}

app.get('/api/pdf/project/:id', async (req, res) => {
  const db = await load();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p || !canSeeProject(req.user, p)) return res.status(404).json({ error: 'not found' });
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Nota-${p.id}.pdf"`);
  doc.pipe(res);
  kop(doc, `NOTA TANDA TERIMA & CLOSING — ${p.id}`);
  const rows = [
    ['Tanggal Masuk', p.tgl], ['Nama Proyek / Perangkat', p.nama],
    ['Jenis Layanan', p.layanan], ['Penanggung Jawab (PIC)', p.pic],
    ['Nama Klien', p.klien], ['WhatsApp Klien', p.wa],
    ['Status Bayar', p.bayar], ['Biaya', rupiah(p.biaya)],
    ['Status Pengerjaan', p.status], ['Periode Garansi', garansiText(p)],
    ['INPUT (Dari Klien)', p.input || '-'],
    ['DIAGNOSIS AWAL', p.diagnosis || '-'],
    ['OUTPUT (Hasil Kudostack)', p.output || '-'],
    ['LAPORAN HASIL TEKNISI', p.reportTeknisi || '-']
  ];
  rows.forEach(([k, v]) => {
    const vStr = String(v || '-');
    if (doc.y > 720) { doc.addPage(); doc.y = 70; }
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#7a4b8f').text(k, 50, doc.y + 2, { width: 160 });
    doc.font('Helvetica').fontSize(9.5).fillColor(C.ink).text(vStr, 220, doc.y, { width: 325 });
    doc.moveDown(0.45);
  });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#7a4b8f').text('Dokumentasi Foto');
  doc.moveDown(0.4);
  const w = 225, h = 155;
  const images = await prefetchImages([...(p.fotoIn || []), ...(p.fotoOut || [])]);
  const drawFoto = (arr, label, soft) => {
    (arr || []).forEach((u, i) => {
      if (doc.y + h + 26 > 760) { doc.addPage(); doc.y = 70; }
      const yFoto = doc.y;
      doc.roundedRect(50, yFoto, w, h, 8).fill(soft);
      paint(doc, images, u, 50, yFoto, [w, h]);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.ink).text(`${label} #${i + 1}`, 50, yFoto + h + 5, { width: w, align: 'center' });
      doc.y = yFoto + h + 24;
    });
  };
  drawFoto(p.fotoIn, 'Foto Penerimaan (Before)', C.blueSoft);
  drawFoto(p.fotoOut, 'Foto Closing (After)', C.pinkSoft);
  if (!(p.fotoIn || []).length && !(p.fotoOut || []).length) {
    doc.font('Helvetica').fontSize(9).fillColor('#888').text('Belum ada foto terunggah.');
    doc.moveDown(0.5);
  }
  if (doc.y + 60 > 760) { doc.addPage(); doc.y = 70; }
  doc.roundedRect(50, doc.y, 495, 30, 8).fill(C.greenSoft);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#137a42').text('GARANSI: ' + garansiText(p), 62, doc.y + 10);
  doc.y += 42;
  // tanda tangan digital
  if (p.signature && p.signature.startsWith('data:image')) {
    try {
      const b64 = p.signature.split(',')[1];
      const fmt = p.signature.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#7a4b8f').text('Tanda Tangan Digital');
      doc.moveDown(0.3);
      const sy = doc.y;
      doc.image(Buffer.from(b64, 'base64'), 320, sy, { fit: [180, 70] });
      doc.moveTo(320, sy + 76).lineTo(500, sy + 76).lineWidth(1).strokeColor('#999').stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#666').text(p.pic + ' — PIC Kudostack', 320, sy + 80, { width: 180, align: 'center' });
      doc.y = sy + 100;
    } catch (e) {}
  }
  footerNote(doc); doc.end();
});

app.get('/api/pdf/projects', async (req, res) => {
  const db = await load();
  const images = await prefetchImages(db.projects.flatMap(p => [...(p.fotoIn || []), ...(p.fotoOut || [])]));
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Rekap-Proyek.pdf"');
  doc.pipe(res);
  kop(doc, 'LAPORAN REKAP PROYEK');
  const garShort = p => p.garansiNum ? `${p.garansiNum} ${p.garansiUnit}${p.garansiAkhir ? '\ns.d. ' + p.garansiAkhir : ''}` : '-';
  colorfulTable(doc,
    ['ID', 'Nama Proyek', 'Layanan', 'PIC', 'Klien / WA', 'Bayar', 'Status', 'Garansi', 'Biaya'],
    db.projects.map(p => [p.id, p.nama, p.layanan, p.pic, p.klien + (p.wa ? '\n' + p.wa : ''), colored(p.bayar, p.bayar === 'Lunas' ? '#137a42' : p.bayar === 'DP' ? '#c47b00' : '#b91c1c'), colored(p.status, p.status === 'Komplain / Kendala' ? '#b91c1c' : C.ink), garShort(p), money(p.biaya)]),
    [46, 96, 48, 46, 78, 48, 70, 52, 44]);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#7a4b8f')
    .text('Total nilai proyek: ' + rupiah(db.projects.reduce((s, p) => s + p.biaya, 0)));
  // Detail lengkap tiap proyek: semua inputan tercetak
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#7a4b8f').text('DETAIL LENGKAP TIAP PROYEK (semua inputan)');
  doc.moveDown(0.3);
  db.projects.forEach(p => {
    if (doc.y > 640) { doc.addPage(); doc.y = 70; }
    doc.roundedRect(50, doc.y, 495, 26, 8).fill(C.blueSoft);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(`${p.id} — ${p.nama}  (${p.layanan} · ${p.bayar} · ${rupiah(p.biaya)})`, 58, doc.y + 8, { width: 480 });
    doc.y += 32;
    const fields = [
      ['Tanggal / PIC / Klien', `${p.tgl} · PIC: ${p.pic} · Klien: ${p.klien}${p.wa ? ' (WA ' + p.wa + ')' : ''}`],
      ['INPUT (Dari Klien)', p.input || '-'],
      ['DIAGNOSIS AWAL', p.diagnosis || '-'],
      ['OUTPUT (Hasil)', p.output || '-'],
      ['LAPORAN TEKNISI', p.reportTeknisi || '-'],
      ['GARANSI', garansiText(p)]
    ];
    fields.forEach(([k, v]) => {
      if (doc.y > 730) { doc.addPage(); doc.y = 70; }
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#7a4b8f').text(k, 56, doc.y);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.ink).text(String(v), 200, doc.y - 11, { width: 345 });
      doc.moveDown(0.25);
    });
    // foto before/after per proyek
    const drawMini = (arr, label, soft) => {
      (arr || []).forEach((u, i) => {
        if (doc.y + 105 > 760) { doc.addPage(); doc.y = 70; }
        const fy = doc.y;
        const fw = 120, fh = 82;
        doc.roundedRect(56, fy, fw, fh, 6).fill(soft);
        paint(doc, images, u, 56, fy, [fw, fh]);
        doc.font('Helvetica').fontSize(7.5).fillColor('#666').text(`${label} #${i + 1}`, 56, fy + fh + 3, { width: fw, align: 'center' });
        doc.y = fy + fh + 18;
      });
    };
    const anyFoto = (p.fotoIn || []).length || (p.fotoOut || []).length;
    if (anyFoto) {
      if (doc.y > 560) { doc.addPage(); doc.y = 70; }
      doc.moveDown(0.2);
      const twoCol = (p.fotoIn || []).length && (p.fotoOut || []).length;
      let fx = 56;
      const drawSide = (arr, label, soft, x) => (arr || []).slice(0, 2).forEach((u, i) => {
        const fy = doc.y;
        const fw = 120, fh = 82;
        doc.roundedRect(x, fy, fw, fh, 6).fill(soft);
        paint(doc, images, u, x, fy, [fw, fh]);
        doc.font('Helvetica').fontSize(7.5).fillColor('#666').text(`${label} #${i + 1}`, x, fy + fh + 3, { width: fw, align: 'center' });
      });
      if (twoCol) {
        const maxY = doc.y;
        drawSide(p.fotoIn, 'Before', C.blueSoft, 56);
        drawSide(p.fotoOut, 'After', C.pinkSoft, 200);
        doc.y = maxY + 105;
      } else {
        drawMini(p.fotoIn.length ? p.fotoIn : p.fotoOut, p.fotoIn.length ? 'Before' : 'After', p.fotoIn.length ? C.blueSoft : C.pinkSoft);
      }
    }
    // tanda tangan digital
    if (p.signature && p.signature.startsWith('data:image')) {
      try {
        if (doc.y + 90 > 760) { doc.addPage(); doc.y = 70; }
        const b64 = p.signature.split(',')[1];
        const sy = doc.y;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#7a4b8f').text('Tanda Tangan:', 56, sy);
        doc.image(Buffer.from(b64, 'base64'), 200, sy - 4, { fit: [140, 60] });
        doc.y = sy + 66;
      } catch (e) {}
    }
    doc.moveDown(0.5);
  });
  footerNote(doc); doc.end();
});

app.get('/api/pdf/finance', async (req, res) => {
  const db = await load();
  const periode = req.query.periode || 'all';
  const daysMap = { '1w': 7, '1m': 30, '3m': 91, '6m': 182, '1y': 365 };
  const labelMap = { '1w': '1 MINGGU', '1m': '1 BULAN', '3m': '3 BULAN', '6m': '6 BULAN', '1y': '1 TAHUN', all: 'SEMUA PERIODE' };
  let trx = db.transactions.slice().sort((a, b) => a.tgl.localeCompare(b.tgl));
  if (daysMap[periode]) {
    const batas = new Date(Date.now() - daysMap[periode] * DAY).toISOString().slice(0, 10);
    trx = trx.filter(t => t.tgl >= batas);
  }
  const inSum = trx.filter(t => t.jenis === 'Uang Masuk').reduce((s, t) => s + t.nominal, 0);
  const outSum = trx.filter(t => t.jenis === 'Uang Keluar').reduce((s, t) => s + t.nominal, 0);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Keuangan-${periode}.pdf"`);
  doc.pipe(res);
  kop(doc, 'LAPORAN KEUANGAN — PERIODE ' + labelMap[periode]);
  let y = chipRow(doc, [
    ['Uang Masuk', rupiah(inSum), C.greenSoft], ['Uang Keluar', rupiah(outSum), '#ffdad6'],
    ['Saldo Bersih', rupiah(inSum - outSum), '#efe3ff'], ['Jumlah Transaksi', String(trx.length), C.blueSoft]
  ], doc.y);
  doc.y = y;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#7a4b8f').text('RINCIAN TRANSAKSI');
  doc.moveDown(0.3);
  // kolom Keterangan dilebarkan, kolom lain disesuaikan
  colorfulTable(doc, ['ID', 'Tanggal', 'Jenis', 'Kategori', 'PIC', 'Nominal', 'Keterangan'],
    trx.map(t => [t.id, t.tgl, colored(t.jenis, t.jenis === 'Uang Masuk' ? '#137a42' : '#b91c1c'), t.kategori, t.pic, money(t.nominal), t.ket]),
    [52, 58, 62, 62, 55, 66, 140]);
  doc.roundedRect(50, doc.y + 4, 495, 28, 8).fill(inSum - outSum >= 0 ? C.greenSoft : '#ffdad6');
  doc.font('Helvetica-Bold').fontSize(12).fillColor(inSum - outSum >= 0 ? '#137a42' : '#b91c1c')
    .text(`SALDO BERSIH / PROFIT: ${rupiah(inSum - outSum)}`, 62, doc.y + 12);
  doc.y += 40;
  // rekap per kategori (semua inputan kategori ikut terangkum)
  const kat = {};
  trx.forEach(t => {
    kat[t.kategori] = kat[t.kategori] || { masuk: 0, keluar: 0, n: 0 };
    kat[t.kategori].n++;
    if (t.jenis === 'Uang Masuk') kat[t.kategori].masuk += t.nominal; else kat[t.kategori].keluar += t.nominal;
  });
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#7a4b8f').text('REKAP PER KATEGORI');
  doc.moveDown(0.3);
  colorfulTable(doc, ['Kategori', 'Jumlah Transaksi', 'Uang Masuk', 'Uang Keluar', 'Selisih'],
    Object.entries(kat).map(([k, v]) => [k, String(v.n), money(v.masuk), money(v.keluar), money(v.masuk - v.keluar)]),
    [130, 90, 95, 95, 85]);
  doc.y += 6;
  // pembagian omzet 50/30/20
  const omzetLunas = db.projects.filter(p => p.bayar === 'Lunas').reduce((s, p) => s + p.biaya, 0);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#7a4b8f').text('PEMBAGIAN OMZET (proyek Lunas)');
  doc.moveDown(0.3);
  const bagiY = doc.y;
  const bw = 155, gap = 10;
  [['PIC / Teknisi — 50%', omzetLunas * 0.5, C.greenSoft, '#137a42'],
   ['Operasional — 30%', omzetLunas * 0.3, C.blueSoft, '#1c6fbe'],
   ['Kas Kudostack — 20%', omzetLunas * 0.2, C.pinkSoft, '#c2417f']].forEach(([lbl, val, bg, fg], i) => {
    const bx = 50 + i * (bw + gap);
    doc.roundedRect(bx, bagiY, bw, 44, 8).fill(bg);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(fg).text(lbl, bx + 8, bagiY + 7, { width: bw - 16 });
    doc.fontSize(10).fillColor(C.ink).text(rupiah(val), bx + 8, bagiY + 22, { width: bw - 16 });
  });
  doc.y = bagiY + 56;
  footerNote(doc); doc.end();
});

app.get('/api/pdf/master', async (req, res) => {
  const db = await load();
  const trx = db.transactions;
  const inSum = trx.filter(t => t.jenis === 'Uang Masuk').reduce((s, t) => s + t.nominal, 0);
  const outSum = trx.filter(t => t.jenis === 'Uang Keluar').reduce((s, t) => s + t.nominal, 0);
  const omzet = db.projects.filter(p => p.bayar === 'Lunas').reduce((s, p) => s + p.biaya, 0);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Master-Report.pdf"');
  doc.pipe(res);
  kop(doc, 'MASTER REPORT — LAPORAN MENYELURUH');
  let y = chipRow(doc, [
    ['Total Proyek', String(db.projects.length), C.blueSoft],
    ['Selesai', String(db.projects.filter(p => p.status === 'Selesai / Closing').length), C.greenSoft],
    ['Komplain', String(db.projects.filter(p => p.status === 'Komplain / Kendala').length), '#ffdad6'],
    ['Omzet (Lunas)', rupiah(omzet), '#efe3ff'],
    ['Saldo Kas', rupiah(inSum - outSum), C.greenSoft]
  ], doc.y);
  doc.y = y + 6;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#7a4b8f').text('I. TABEL PROYEK');
  doc.moveDown(0.3);
  const garShort2 = p => p.garansiNum ? `${p.garansiNum} ${p.garansiUnit}${p.garansiAkhir ? '\ns.d. ' + p.garansiAkhir : ''}` : '-';
  colorfulTable(doc, ['ID', 'Nama', 'Layanan', 'PIC', 'Klien', 'Bayar', 'Status', 'Garansi', 'Biaya'],
    db.projects.map(p => [p.id, p.nama, p.layanan, p.pic, p.klien, p.bayar, colored(p.status, p.status === 'Komplain / Kendala' ? '#b91c1c' : C.ink), garShort2(p), money(p.biaya)]),
    [44, 88, 46, 46, 56, 48, 72, 54, 42]);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#7a4b8f').text('II. KENDALA / KOMPLAIN');
  doc.moveDown(0.3);
  const kom = db.projects.filter(p => p.status === 'Komplain / Kendala');
  doc.font('Helvetica').fontSize(10).fillColor(C.ink)
    .text(kom.length ? kom.map(p => `${p.id} — ${p.nama} (PIC: ${p.pic})`).join('\n') : 'Tidak ada kendala aktif.');
  doc.addPage();
  kop(doc, 'MASTER REPORT — KEUANGAN (lanjutan)');
  doc.y = 170;
  colorfulTable(doc, ['ID', 'Tanggal', 'Jenis', 'Kategori', 'PIC', 'Nominal', 'Ket'],
    trx.map(t => [t.id, t.tgl, colored(t.jenis, t.jenis === 'Uang Masuk' ? '#137a42' : '#b91c1c'), t.kategori, t.pic, money(t.nominal), t.ket]),
    [52, 58, 62, 62, 55, 66, 140]);
  doc.roundedRect(50, doc.y + 4, 495, 28, 8).fill(C.greenSoft);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#137a42').text(`SALDO BERSIH: ${rupiah(inSum - outSum)}`, 62, doc.y + 12);
  footerNote(doc); doc.end();
});

/* ================= EXPORT CSV / JSON (SEMUA INPUTAN) ================= */
const csvCell = v => {
  const t = String(v ?? '').replace(/\r?\n/g, ' | ');
  return /[",;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
const sendCsv = (res, filename, headers, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\ufeff' + [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n'));
};

app.get('/api/export/projects.csv', async (req, res) => {
  const db = await load();
  const H = ['ID', 'Tanggal', 'Nama Proyek', 'Layanan', 'PIC', 'Klien', 'No WA', 'Biaya', 'Status Bayar', 'Status Pengerjaan',
    'Input dari Klien', 'Diagnosis Awal', 'Output / Hasil', 'Laporan Teknisi', 'Garansi (angka)', 'Garansi (satuan)', 'Garansi Berlaku s.d.',
    'Jumlah Foto Masuk', 'Jumlah Foto Closing', 'Ada Tanda Tangan'];
  sendCsv(res, 'Kudostack-Proyek-Lengkap.csv', H, db.projects.map(p => [
    p.id, p.tgl, p.nama, p.layanan, p.pic, p.klien, p.wa, p.biaya, p.bayar, p.status,
    p.input, p.diagnosis, p.output, p.reportTeknisi, p.garansiNum, p.garansiUnit, p.garansiAkhir,
    (p.fotoIn || []).length, (p.fotoOut || []).length, p.signature ? 'ya' : 'tidak'
  ]));
});

app.get('/api/export/transactions.csv', async (req, res) => {
  const db = await load();
  const H = ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'PIC Keuangan', 'Keterangan'];
  sendCsv(res, 'Kudostack-Keuangan-Lengkap.csv', H,
    db.transactions.slice().sort((a, b) => a.tgl.localeCompare(b.tgl))
      .map(t => [t.id, t.tgl, t.jenis, t.kategori, t.nominal, t.pic, t.ket]));
});

app.get('/api/export/projects.json', async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="Kudostack-Proyek-Lengkap.json"');
  res.json((await load()).projects);
});
app.get('/api/export/transactions.json', async (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="Kudostack-Keuangan-Lengkap.json"');
  res.json((await load()).transactions);
});

/* ================= KIRIM WA ================= */
app.post('/api/send-wa', async (req, res) => {
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'Nomor tujuan & pesan wajib' });
  const item = {
    id: 'WA-' + Date.now(), to: String(to).replace(/\D/g, ''), message,
    footerIncluded: message.includes('+62 851-6585-9837'),
    createdAt: new Date().toISOString(), status: 'queued'
  };
  await updateDoc('wa-outbox', () => [], (outbox) => {
    const list = Array.isArray(outbox) ? outbox : [];
    list.push(item);
    return list;
  });
  res.json({ ok: true, id: item.id, note: 'Masuk antrean kirim WA server (outbox).' });
});
app.get('/api/send-wa/outbox', async (req, res) => {
  const existing = await loadDoc('wa-outbox');
  res.json(Array.isArray(existing) ? existing : []);
});

/* ================= CONTENT PLANNER (kalender konten medsos) ================= */
const getPlans = () => readOrSeed('plans', () => []);
// F11: Draft -> Review -> Disetujui (or Ditolak) -> Tayang. medsos drafts and
// submits; superadmin/admin approve. Approving records who and when.
const PLAN_STATUS = ['Draft', 'Review', 'Disetujui', 'Ditolak', 'Tayang'];

app.get('/api/plans', async (req, res) => res.json(await getPlans()));
app.post('/api/plans', async (req, res) => {
  const { tanggal, judul, platform, brief, prompt, caption } = req.body || {};
  if (!tanggal || !judul) return res.status(400).json({ error: 'Tanggal & judul wajib' });
  const item = {
    id: 'CP-' + Date.now(),
    tanggal, judul, platform: platform || 'Instagram',
    brief: brief || '', prompt: prompt || '', caption: caption || '',
    status: 'Draft', dibuat: req.user.username, createdAt: new Date().toISOString()
  };
  await updateDoc('plans', () => [], (plans) => {
    const list = Array.isArray(plans) ? plans : [];
    list.push(item);
    return list;
  });
  res.json(item);
});
app.put('/api/plans/:id', async (req, res) => {
  let missing = false, saved = null, bad = null, denied = null;
  await updateDoc('plans', () => [], (plans) => {
    const list = Array.isArray(plans) ? plans : [];
    const p = list.find(x => x.id === req.params.id);
    if (!p) { missing = true; return list; }
    const b = req.body || {};
    const mgr = MGR.includes(req.user.role);
    if (b.status !== undefined && b.status !== p.status) {
      if (!PLAN_STATUS.includes(b.status)) { bad = 'Status harus salah satu: ' + PLAN_STATUS.join(', '); return list; }
      if (['Disetujui', 'Ditolak'].includes(b.status) && !mgr) { denied = 'Hanya superadmin/admin yang bisa menyetujui atau menolak konten'; return list; }
      if (b.status === 'Tayang' && p.status !== 'Disetujui' && !mgr) { denied = 'Konten harus disetujui dulu sebelum tayang'; return list; }
    }
    const content = ['tanggal', 'judul', 'platform', 'brief', 'prompt', 'caption'];
    const edited = content.some(k => b[k] !== undefined && b[k] !== p[k]);
    content.forEach(k => { if (b[k] !== undefined) p[k] = b[k]; });
    if (b.status !== undefined && b.status !== p.status) {
      p.status = b.status;
      if (['Disetujui', 'Ditolak'].includes(b.status)) { p.disetujuiOleh = req.user.username; p.disetujuiPada = new Date().toISOString(); }
    } else if (edited && !mgr && ['Disetujui', 'Ditolak'].includes(p.status)) {
      // F11: content changed after review goes back to review.
      p.status = 'Review';
    }
    saved = p;
    return list;
  });
  if (missing) return res.status(404).json({ error: 'Tidak ditemukan' });
  if (bad) return res.status(400).json({ error: bad });
  if (denied) return res.status(403).json({ error: denied });
  res.json(saved);
});
app.delete('/api/plans/:id', async (req, res) => {
  await updateDoc('plans', () => [], (plans) => (Array.isArray(plans) ? plans : []).filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});


/* ================= QRIS PEMBAYARAN (editable superadmin/admin) ================= */
const QRIS_DEFAULT = { nama: 'KUDOSTACK, Service', nmid: 'ID1026635766458', tipe: 'Statis (selamanya)', diubah: '-', oleh: '-' };
async function getQrisMeta() {
  const existing = await loadDoc('qris-meta');
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) return { ...QRIS_DEFAULT };
  return existing;
}
app.get('/api/qris', async (req, res) => res.json(await getQrisMeta()));
app.post('/api/qris', async (req, res) => {
  const { nama, nmid, tipe } = req.body || {};
  if (!(await confirmPassword(req, res))) return;
  const before = await getQrisMeta();
  const meta = await updateDoc('qris-meta', () => ({ ...QRIS_DEFAULT }), (current) => {
    const next = (!current || typeof current !== 'object' || Array.isArray(current)) ? { ...QRIS_DEFAULT } : current;
    if (nama !== undefined) next.nama = nama;
    if (nmid !== undefined) next.nmid = nmid;
    if (tipe !== undefined) next.tipe = tipe;
    next.diubah = new Date().toISOString().slice(0, 10);
    next.oleh = req.user.username;
    return next;
  });
  await audit(req, 'qris.meta', 'qris', { before: { nama: before.nama, nmid: before.nmid, tipe: before.tipe }, after: { nama: meta.nama, nmid: meta.nmid, tipe: meta.tipe } });
  res.json({ ok: true, meta });
});
app.post('/api/qris/image', async (req, res) => {
  const b64 = (req.body || {}).image || '';
  const m = b64.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'File harus gambar PNG/JPG (maks 5 MB)' });
  if (!(await confirmPassword(req, res))) return;
  const buf = Buffer.from(m[2], 'base64');
  const sniff = sniffType(buf);
  if (sniff !== 'image/png' && sniff !== 'image/jpeg') return res.status(400).json({ error: 'Isi file bukan gambar PNG/JPG' });
  const contentType = m[1] === 'png' ? 'image/png' : 'image/jpeg';
  let imageUrl = null;
  if (usingRemote()) imageUrl = await uploadObject('qris/current', buf, contentType);
  else {
    fs.mkdirSync(path.dirname(QRIS_IMG), { recursive: true });
    fs.writeFileSync(QRIS_IMG, buf);
  }
  await updateDoc('qris-meta', () => ({ ...QRIS_DEFAULT }), (current) => {
    const next = (!current || typeof current !== 'object' || Array.isArray(current)) ? { ...QRIS_DEFAULT } : current;
    if (imageUrl) next.imageUrl = imageUrl;
    else delete next.imageUrl;
    next.diubah = new Date().toISOString().slice(0, 10);
    next.oleh = req.user.username;
    return next;
  });
  const digest = Buffer.from(await crypto.subtle.digest('SHA-256', buf)).toString('hex');
  await audit(req, 'qris.image', 'qris', { after: { bytes: buf.length, type: sniff, sha256: digest } });
  res.json({ ok: true });
});


/* ================= META PEMBAYARAN (ewallet/bank/va) + LOKASI — editable superadmin/admin ================= */
const DEF_PAYMETA = {
  ewallet: [
    { nama: 'GoPay', nomor: '0851-6585-9837' }, { nama: 'OVO', nomor: '0851-6585-9837' },
    { nama: 'DANA', nomor: '0851-6585-9837' }, { nama: 'ShopeePay', nomor: '0851-6585-9837' }
  ],
  bank: [
    { nama: 'BCA', nomor: '1234567890' }, { nama: 'BRI', nomor: '098765432112345' },
    { nama: 'Mandiri', nomor: '1122334455' }, { nama: 'BNI', nomor: '0551234567' }
  ],
  va: [
    { nama: 'VA BCA', nomor: '8808 5165 8598 37' }, { nama: 'VA BRI', nomor: '8810 8516 5859 837' },
    { nama: 'VA Mandiri', nomor: '8950 8516 5859 837' }, { nama: 'VA BNI', nomor: '9881 8516 5859 837' }
  ],
  an: 'Kudostack Official',
  lokasi: { alamat: '', lat: null, lng: null, catatan: '' }
};
async function getPayMeta() {
  const existing = await loadDoc('paymeta');
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) return JSON.parse(JSON.stringify(DEF_PAYMETA));
  return { ...DEF_PAYMETA, ...existing };
}
app.get('/api/paymeta', async (req, res) => res.json(await getPayMeta()));
const PAY_FIELDS = ['ewallet', 'bank', 'va', 'an'];
app.put('/api/paymeta', async (req, res) => {
  const b = req.body || {};
  const before = await getPayMeta();
  const touches = PAY_FIELDS.filter(k => b[k] !== undefined && JSON.stringify(b[k]) !== JSON.stringify(before[k]));
  // Account numbers and the account name need the password; the shop location does not.
  if (touches.length && !(await confirmPassword(req, res))) return;
  const meta = await updateDoc('paymeta', () => JSON.parse(JSON.stringify(DEF_PAYMETA)), (current) => {
    const next = (!current || typeof current !== 'object' || Array.isArray(current))
      ? JSON.parse(JSON.stringify(DEF_PAYMETA))
      : { ...DEF_PAYMETA, ...current };
    ['ewallet', 'bank', 'va'].forEach(k => { if (Array.isArray(b[k])) next[k] = b[k]; });
    if (b.an !== undefined) next.an = b.an;
    if (b.lokasi && typeof b.lokasi === 'object') next.lokasi = { ...next.lokasi, ...b.lokasi };
    return next;
  });
  const changed = [...PAY_FIELDS, 'lokasi'].filter(k => JSON.stringify(before[k]) !== JSON.stringify(meta[k]));
  if (changed.length) {
    await audit(req, 'paymeta', changed.join(','), {
      before: Object.fromEntries(changed.map(k => [k, before[k]])),
      after: Object.fromEntries(changed.map(k => [k, meta[k]]))
    });
  }
  res.json({ ok: true, meta });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));
app.use((err, req, res, next) => {
  // Body-parser errors carry the raw request body (e.g. a login password): log the type only.
  if (err && err.type && err.status && err.status < 500) {
    console.error('bad request:', err.type);
    if (res.headersSent) return next(err);
    return res.status(err.status).json({ error: 'Permintaan tidak valid' });
  }
  console.error(err);
  if (res.headersSent) return next(err);
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Maksimal 10 MB' });
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

module.exports = app;

if (usingCloudflare()) {
  // cf/entry.mjs hands requests to this listener through httpServerHandler.
  // No I/O here: Workers forbid it during module initialization.
  app.listen(PORT);
} else initPersistence().then(info => {
  app.listen(PORT, '0.0.0.0', () => {
    const where = info.mode === 'supabase' ? `supabase bucket ${info.bucket}` : 'local files';
    console.log(`Kudostack Admin Hub running on http://0.0.0.0:${PORT} (${where})`);
  });
}).catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
