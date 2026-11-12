const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
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
  'wa-outbox': 'wa-outbox.json'
};

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const BUCKET = (process.env.SUPABASE_BUCKET || 'uploads').trim() || 'uploads';

if ((SUPABASE_URL && !SUPABASE_SERVICE_ROLE_KEY) || (!SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error('Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or leave both unset to use local files.');
}

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function usingRemote() {
  return Boolean(supabase);
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
  const { error } = await supabase
    .from('app_documents')
    .upsert(
      { id, data: clone(data), updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw new Error('Supabase write failed: ' + error.message);
}

async function readMainUnlocked() {
  if (!supabase) {
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
  if (!supabase) writeJsonFile(DB_FILE, db);
  else await writeRow(DOC_MAIN, db);
}

function localDocPath(id) {
  const name = LOCAL_FILES[id];
  if (!name) throw new Error('Unknown document ' + id);
  return path.join(DATA_DIR, name);
}

async function readDocUnlocked(id) {
  if (!supabase) {
    const file = localDocPath(id);
    if (!fs.existsSync(file)) return undefined;
    return readJsonFile(file);
  }
  return readRow(id);
}

async function writeDocUnlocked(id, data) {
  if (!supabase) writeJsonFile(localDocPath(id), data);
  else await writeRow(id, data);
}

function load() {
  return lock(() => readMainUnlocked());
}

function save(db) {
  return lock(() => writeMainUnlocked(db));
}

function loadDoc(id) {
  return lock(() => readDocUnlocked(id));
}

function saveDoc(id, data) {
  return lock(() => writeDocUnlocked(id, data));
}

// Read, mutate in place, and write as one locked step.
function update(mutator) {
  return lock(async () => {
    const db = await readMainUnlocked();
    const result = await mutator(db);
    await writeMainUnlocked(db);
    return result;
  });
}

function updateDoc(id, fallback, mutator) {
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

function readOrSeed(id, fallback) {
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

async function removeStored(url) {
  if (!url) return;
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

module.exports = {
  load, save, loadDoc, saveDoc, update, updateDoc, readOrSeed,
  uploadObject, removeStored, usingRemote, initPersistence,
  DB_FILE, DATA_DIR, UPLOADS_DIR, ADMIN_WA, BUCKET
};
