const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
// Local-only dirs: never touched when Supabase is configured (remote mode
// uses Storage for photos and no local files at all). All local mkdir/write
// calls are lazy so a read-only filesystem (e.g. Cloudvea/Render containers)
// cannot crash the boot sequence.
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_WA = '+62 851-6585-9837';
const DOC_MAIN = 'main';

// Side documents that used to live next to db.json. Same table, separate rows,
// so users, plans, payment info, and the WA outbox also survive an ephemeral disk.
const LOCAL_FILES = {
  users: 'users.json',
  plans: 'plans.json',
  'qris-meta': 'qris-meta.json',
  paymeta: 'paymeta.json',
  'wa-outbox': 'wa-outbox.json',
  sessions: 'sessions.json',
  audit: 'audit.json'
};

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const BUCKET = (process.env.SUPABASE_BUCKET || 'uploads').trim() || 'uploads';

if ((SUPABASE_URL && !SUPABASE_SERVICE_ROLE_KEY) || (!SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error('Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both unset to use local files.');
}

// Cloudflare Pages: the worker entry (cf/entry.mjs) sets globalThis.__CF_ENV to
// the bindings before this module loads. DB is a D1 database with the same
// app_documents table as Supabase; FILES is a KV namespace for photos/QRIS.
const CF = globalThis.__CF_ENV && globalThis.__CF_ENV.DB && globalThis.__CF_ENV.FILES
  ? globalThis.__CF_ENV
  : null;
const CF_PREFIX = '/files/';
const TABLES = CF ? require('./d1tables').makeStore(CF.DB) : null;

// S7/F6: 'docs' = one JSON row per document in app_documents (original layout);
// 'tables' = one row per record (d1tables.js). The switch is one-way and is
// requested by setting settings.storage = 'migrate' (see README "Migrasi tabel").
let storageCached = null;
async function storageMode() {
  if (!CF) return 'docs';
  if (storageCached) return storageCached;
  let v;
  try { v = await CF.DB.prepare("select value from settings where key = 'storage'").first('value'); }
  catch (e) { return 'docs'; } // settings table not created yet (migration 0003 not applied)
  if (v === 'tables') return (storageCached = 'tables');
  if (v === 'migrate') {
    try {
      const r = await TABLES.migrate();
      if (!r.ok) console.error('table migration:', r.reason);
    } catch (e) { console.error('table migration failed:', e.message); }
    const again = await CF.DB.prepare("select value from settings where key = 'storage'").first('value');
    if (again === 'tables') return (storageCached = 'tables');
  }
  return 'docs';
}
const usingTables = async () => (await storageMode()) === 'tables';

let supabase = null;
if (!CF && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function usingRemote() {
  return Boolean(supabase || CF);
}

function usingCloudflare() {
  return Boolean(CF);
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function seedData() {
  return {
    projects: [
      { id: 'KDS-001', tgl: '2026-11-01', nama: 'Servis Laptop ASUS ROG', layanan: 'Hardware', pic: 'Rizky', klien: 'Bapak Andi', wa: '6281234567890', biaya: 750000, bayar: 'Lunas', status: 'Selesai / Closing', input: 'Laptop tidak bisa nyala, keriput GPU overheat', output: 'Ganti thermal paste, cleaning fan, thermal problem solved', fotoIn: [], fotoOut: [] },
      { id: 'KDS-002', tgl: '2026-11-03', nama: 'Install Software Kasir POS', layanan: 'Software', pic: 'Dina', klien: 'Toko Berkah', wa: '6289876543210', biaya: 500000, bayar: 'DP', status: 'Sedang Dikerjakan', input: 'Request install aplikasi kasir + backup data lama', output: 'Install 70%, menunggu lisensi klien', fotoIn: [], fotoOut: [] },
      { id: 'KDS-003', tgl: '2026-11-05', nama: 'Desain Banner & Cetak', layanan: 'DLL', pic: 'Sinta', klien: 'Cafe Senja', wa: '6285551234567', biaya: 300000, bayar: 'Belum Bayar', status: 'Baru Masuk', input: 'Brief banner promosi opening, logo dari klien', output: 'Draft pertama dikirim, revisi 1x gratis', fotoIn: [], fotoOut: [] }
    ],
    transactions: [
      { id: 'TRX-001', tgl: '2026-11-02', jenis: 'Uang Masuk', kategori: 'Hardware', nominal: 750000, pic: 'Rizky', ket: 'Pembayaran lunas KDS-001' },
      { id: 'TRX-002', tgl: '2026-11-03', jenis: 'Uang Keluar', kategori: 'Operasional', nominal: 150000, pic: 'Dina', ket: 'Beli thermal paste & consumables' },
      { id: 'TRX-003', tgl: '2026-11-04', jenis: 'Uang Masuk', kategori: 'Software', nominal: 250000, pic: 'Dina', ket: 'DP 50% KDS-002' }
    ],
    counters: { project: 4, trx: 4 }
  };
}

// load() and save() are async, so overlapping requests would otherwise
// read-modify-write the same document and drop updates. One queue keeps
// the previous synchronous behavior: each mutation finishes before the next.
let tail = Promise.resolve();
function lock(fn) {
  // Workers: a promise chain shared across requests hangs the runtime, and the
  // in-memory queue cannot protect isolates on other machines anyway.
  if (CF) return Promise.resolve().then(fn);
  const run = tail.then(() => fn());
  tail = run.then(() => {}, () => {});
  return run;
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJsonFile(file, data) {
  ensureDataDir();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

async function readRow(id) {
  if (CF) {
    const row = await CF.DB.prepare('select data from app_documents where id = ?').bind(id).first();
    return row ? JSON.parse(row.data) : undefined;
  }
  const { data, error } = await supabase
    .from('app_documents')
    .select('data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Supabase read failed: ' + error.message);
  if (!data) return undefined;
  return data.data;
}

async function writeRow(id, data) {
  if (CF) {
    await CF.DB.prepare(
      'insert into app_documents (id, data, updated_at) values (?1, ?2, ?3) ' +
      'on conflict(id) do update set data = excluded.data, updated_at = excluded.updated_at'
    ).bind(id, JSON.stringify(data), new Date().toISOString()).run();
    return;
  }
  const { error } = await supabase
    .from('app_documents')
    .upsert(
      { id, data: clone(data), updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw new Error('Supabase write failed: ' + error.message);
}

async function readMainUnlocked() {
  if (!usingRemote()) {
    if (!fs.existsSync(DB_FILE)) {
      const seed = seedData();
      writeJsonFile(DB_FILE, seed);
      return seed;
    }
    return readJsonFile(DB_FILE);
  }
  const existing = await readRow(DOC_MAIN);
  if (existing === undefined || existing === null) {
    const seed = seedData();
    await writeRow(DOC_MAIN, seed);
    return seed;
  }
  return existing;
}

async function writeMainUnlocked(db) {
  if (!usingRemote()) writeJsonFile(DB_FILE, db);
  else await writeRow(DOC_MAIN, db);
}

function localDocPath(id) {
  const name = LOCAL_FILES[id];
  if (!name) throw new Error('Unknown document ' + id);
  return path.join(DATA_DIR, name);
}

async function readDocUnlocked(id) {
  if (!usingRemote()) {
    const file = localDocPath(id);
    if (!fs.existsSync(file)) return undefined;
    return readJsonFile(file);
  }
  return readRow(id);
}

async function writeDocUnlocked(id, data) {
  if (!usingRemote()) writeJsonFile(localDocPath(id), data);
  else await writeRow(id, data);
}

async function load() {
  if (await usingTables()) {
    const { data } = await TABLES.read('main');
    if (data !== undefined) return data;
    return (await TABLES.update('main', seedData, async db => ({ store: db }))).store;
  }
  return lock(() => readMainUnlocked());
}

function save(db) {
  return lock(() => writeMainUnlocked(db));
}

async function loadDoc(id) {
  if (await usingTables()) return (await TABLES.read(id)).data;
  return lock(() => readDocUnlocked(id));
}

function saveDoc(id, data) {
  return lock(() => writeDocUnlocked(id, data));
}

// Cloudflare: requests run in many isolates, so the in-memory lock cannot
// serialize writes. Compare-and-swap on updated_at instead and retry on conflict.
async function cfReadVersioned(id) {
  const row = await CF.DB.prepare('select data, updated_at from app_documents where id = ?').bind(id).first();
  return row ? { data: JSON.parse(row.data), version: row.updated_at } : { data: undefined, version: null };
}

async function cfWriteIfUnchanged(id, data, version) {
  const now = new Date().toISOString() + '#' + Math.random().toString(36).slice(2, 8);
  const r = version === null
    ? await CF.DB.prepare('insert into app_documents (id, data, updated_at) values (?1, ?2, ?3) on conflict(id) do nothing')
        .bind(id, JSON.stringify(data), now).run()
    : await CF.DB.prepare('update app_documents set data = ?2, updated_at = ?3 where id = ?1 and updated_at = ?4')
        .bind(id, JSON.stringify(data), now, version).run();
  return r.meta.changes === 1;
}

// step(data) returns { store, result }: the document to write and the value to hand back.
async function cfUpdate(id, fallback, step) {
  for (let attempt = 0; attempt < 15; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 15 + Math.random() * 40 * attempt));
    // Re-checked on every attempt: a switch to tables makes this write's CAS fail.
    if (await usingTables()) return TABLES.update(id, fallback, step);
    const { data: current, version } = await cfReadVersioned(id);
    let data = current;
    if (data === undefined || data === null) data = typeof fallback === 'function' ? fallback() : clone(fallback);
    const { store, result } = await step(data);
    if (await cfWriteIfUnchanged(id, store, version)) return { store, result };
  }
  throw new Error('Data sedang diubah bersamaan, coba lagi');
}

// Read, mutate in place, and write as one locked step.
function update(mutator) {
  if (CF) return cfUpdate(DOC_MAIN, seedData, async db => ({ store: db, result: await mutator(db) })).then(r => r.result);
  return lock(async () => {
    const db = await readMainUnlocked();
    const result = await mutator(db);
    await writeMainUnlocked(db);
    return result;
  });
}

function updateDoc(id, fallback, mutator) {
  if (CF) {
    return cfUpdate(id, fallback, async data => {
      const next = await mutator(data);
      return { store: next === undefined ? data : next };
    }).then(r => r.store);
  }
  return lock(async () => {
    let data = await readDocUnlocked(id);
    if (data === undefined || data === null) {
      data = typeof fallback === 'function' ? fallback() : clone(fallback);
    }
    const next = await mutator(data);
    const stored = next === undefined ? data : next;
    await writeDocUnlocked(id, stored);
    return stored;
  });
}

async function readOrSeed(id, fallback) {
  if (await usingTables()) {
    const { data } = await TABLES.read(id);
    if (data !== undefined && data !== null) return data;
    return (await TABLES.update(id, fallback, async d => ({ store: d }))).store;
  }
  return lock(async () => {
    const existing = await readDocUnlocked(id);
    if (existing !== undefined && existing !== null) return existing;
    const seed = typeof fallback === 'function' ? fallback() : clone(fallback);
    await writeDocUnlocked(id, seed);
    return seed;
  });
}

async function ensureBucket() {
  const existing = await supabase.storage.getBucket(BUCKET);
  if (!existing.error && existing.data) return;
  const created = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024
  });
  if (created.error && !/already exists/i.test(created.error.message || '')) {
    throw new Error(
      'Could not create storage bucket "' + BUCKET + '". Run supabase/schema.sql in the SQL editor. ' + created.error.message
    );
  }
}

async function initPersistence() {
  if (CF) return { mode: 'cloudflare' };
  if (!supabase) return { mode: 'local' };
  const { error } = await supabase.from('app_documents').select('id').limit(1);
  if (error) {
    throw new Error(
      'Supabase table public.app_documents is not ready. Run supabase/schema.sql in the SQL editor. ' + error.message
    );
  }
  await ensureBucket();
  return { mode: 'supabase', bucket: BUCKET };
}

async function uploadObject(objectPath, body, contentType) {
  if (CF) {
    await CF.FILES.put(objectPath, body, { metadata: { contentType: contentType || 'application/octet-stream' } });
    return CF_PREFIX + objectPath.split('/').map(encodeURIComponent).join('/');
  }
  if (!supabase) throw new Error('Supabase storage is not configured');
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
    contentType: contentType || 'application/octet-stream',
    upsert: true
  });
  if (error) throw new Error('Upload failed: ' + error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function objectPathFromPublicUrl(url) {
  if (!url) return null;
  let parsed;
  try { parsed = new URL(url); } catch (e) { return null; }
  const marker = '/storage/v1/object/public/' + BUCKET + '/';
  const i = parsed.pathname.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(parsed.pathname.slice(i + marker.length));
}

// Cloudflare mode: KV object behind a /files/... URL. Returns null otherwise.
function cfKeyFromUrl(url) {
  if (!CF || typeof url !== 'string' || !url.startsWith(CF_PREFIX)) return null;
  try { return url.slice(CF_PREFIX.length).split('/').map(decodeURIComponent).join('/'); } catch (e) { return null; }
}

async function getObject(url) {
  const key = cfKeyFromUrl(url);
  if (!key) return null;
  const { value, metadata } = await CF.FILES.getWithMetadata(key, 'arrayBuffer');
  if (!value) return null;
  return { body: Buffer.from(value), contentType: (metadata && metadata.contentType) || 'application/octet-stream' };
}

async function removeStored(url) {
  if (!url) return;
  const cfKey = cfKeyFromUrl(url);
  if (cfKey) { await CF.FILES.delete(cfKey); return; }
  if (supabase && /^https?:\/\//i.test(url)) {
    const objectPath = objectPathFromPublicUrl(url);
    if (!objectPath) return;
    const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (error) console.error('Supabase storage delete failed:', error.message);
    return;
  }
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;
  const abs = path.resolve(UPLOADS_DIR, path.basename(url));
  const root = path.resolve(UPLOADS_DIR) + path.sep;
  if (abs.startsWith(root) && fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); } catch (e) {}
  }
}

/* ---------- sessions + login rate limits (F1) ----------
   Cloudflare: D1 tables from migrations/0002_sessions.sql.
   Local/Supabase: a "sessions" document; rate limits in memory (one process). */
async function createSession(tokenHash, username, expiresAt) {
  if (CF) {
    await CF.DB.prepare('insert into sessions (token_hash, username, expires_at) values (?1, ?2, ?3)')
      .bind(tokenHash, username, expiresAt).run();
    return;
  }
  await updateDoc('sessions', () => ({}), all => {
    const now = Date.now();
    for (const k of Object.keys(all)) if (all[k].exp < now) delete all[k];
    all[tokenHash] = { u: username, exp: expiresAt };
    return all;
  });
}

async function getSession(tokenHash) {
  const now = Date.now();
  if (CF) {
    const row = await CF.DB.prepare('select username, expires_at from sessions where token_hash = ?').bind(tokenHash).first();
    if (!row) return null;
    if (row.expires_at < now) { await deleteSession(tokenHash); return null; }
    return { username: row.username, expiresAt: row.expires_at };
  }
  const all = (await loadDoc('sessions')) || {};
  const s = all[tokenHash];
  if (!s || s.exp < now) return null;
  return { username: s.u, expiresAt: s.exp };
}

async function deleteSession(tokenHash) {
  if (CF) { await CF.DB.prepare('delete from sessions where token_hash = ?').bind(tokenHash).run(); return; }
  await updateDoc('sessions', () => ({}), all => { delete all[tokenHash]; return all; });
}

async function deleteUserSessions(username, exceptHash) {
  if (CF) {
    await CF.DB.prepare('delete from sessions where username = ?1 and token_hash <> ?2').bind(username, exceptHash || '').run();
    return;
  }
  await updateDoc('sessions', () => ({}), all => {
    for (const k of Object.keys(all)) if (all[k].u === username && k !== exceptHash) delete all[k];
    return all;
  });
}

/* ---------- audit log (F3) ----------
   Cloudflare tables mode: audit table. Otherwise an "audit" document capped at 500 entries. */
const AUDIT_MAX = 500;
async function addAudit(entry) {
  const e = { ts: new Date().toISOString(), ...entry };
  if (await usingTables()) return TABLES.appendAudit(e);
  await updateDoc('audit', () => [], list => {
    const l = Array.isArray(list) ? list : [];
    l.push({ id: (l.length ? l[l.length - 1].id : 0) + 1, ...e });
    return l.slice(-AUDIT_MAX);
  });
}
async function listAudit(limit = 200) {
  if (await usingTables()) return TABLES.listAudit(limit);
  const l = (await loadDoc('audit')) || [];
  return l.slice(-limit).reverse();
}
async function storageInfo() {
  const mode = await storageMode();
  let report = null;
  if (CF) {
    try { const v = await CF.DB.prepare("select value from settings where key = 'migration-report'").first('value'); report = v ? JSON.parse(v) : null; } catch (e) {}
  }
  return { mode: CF ? 'cloudflare-' + mode : supabase ? 'supabase' : 'local', report };
}

const memRate = new Map();
// Counts one attempt for key. Returns { count, resetAt } for the current window.
async function rateHit(key, windowMs) {
  const now = Date.now();
  if (CF) {
    const row = await CF.DB.prepare(
      'insert into rate_limits (key, count, reset_at) values (?1, 1, ?2) on conflict(key) do update set ' +
      'count = case when rate_limits.reset_at < ?3 then 1 else rate_limits.count + 1 end, ' +
      'reset_at = case when rate_limits.reset_at < ?3 then ?2 else rate_limits.reset_at end ' +
      'returning count, reset_at'
    ).bind(key, now + windowMs, now).first();
    return { count: row.count, resetAt: row.reset_at };
  }
  let r = memRate.get(key);
  if (!r || r.resetAt < now) r = { count: 0, resetAt: now + windowMs };
  r.count++;
  memRate.set(key, r);
  return { ...r };
}

async function rateGet(key) {
  const now = Date.now();
  if (CF) {
    const row = await CF.DB.prepare('select count, reset_at from rate_limits where key = ?').bind(key).first();
    return row && row.reset_at >= now ? { count: row.count, resetAt: row.reset_at } : { count: 0, resetAt: now };
  }
  const r = memRate.get(key);
  return r && r.resetAt >= now ? { ...r } : { count: 0, resetAt: now };
}

async function rateClear(key) {
  if (CF) { await CF.DB.prepare('delete from rate_limits where key = ?').bind(key).run(); return; }
  memRate.delete(key);
}

module.exports = {
  createSession, getSession, deleteSession, deleteUserSessions, rateHit, rateGet, rateClear,
  addAudit, listAudit, storageInfo, usingTables, cfEnv: () => CF,
  load, save, loadDoc, saveDoc, update, updateDoc, readOrSeed,
  uploadObject, removeStored, usingRemote, usingCloudflare, getObject, initPersistence,
  DB_FILE, DATA_DIR, UPLOADS_DIR, ADMIN_WA, BUCKET
};
