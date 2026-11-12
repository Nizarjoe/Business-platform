const assert = require('assert');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const SERVICE_KEY = 'service-role-test-key-not-for-browser';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function runNode(args, env, timeoutMs = 15000) {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, args, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({ status: 1, stdout, stderr: stderr + '\ntimed out' });
    }, timeoutMs);
    proc.once('exit', code => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
  });
}

function startApp(env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: { ...process.env, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_BUCKET: '', ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let log = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGKILL');
      reject(new Error('server did not start\n' + log));
    }, 8000);
    const onData = buf => {
      log += buf.toString();
      if (!settled && log.includes('running on')) {
        settled = true;
        clearTimeout(timer);
        resolve({
          proc,
          log: () => log,
          stop() {
            return new Promise(done => {
              if (proc.exitCode !== null) return done();
              proc.once('exit', () => done());
              proc.kill('SIGTERM');
              setTimeout(() => proc.kill('SIGKILL'), 2000);
            });
          }
        });
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.once('exit', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('server exited ' + code + '\n' + log));
    });
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function startSupabaseMock() {
  const docs = new Map();
  const files = new Map();
  let bucketReady = false;
  const calls = [];
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const body = await readBody(req);
      calls.push({ method: req.method, path: url.pathname, apikey: req.headers.apikey || '', authorization: req.headers.authorization || '' });
      const send = (status, payload, type = 'application/json') => {
        const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload));
        res.writeHead(status, { 'content-type': type });
        res.end(buf);
      };
      if (req.method === 'GET' && url.pathname === '/rest/v1/app_documents') {
        const id = url.searchParams.get('id');
        if (!id) return send(200, []);
        const row = docs.get(id.replace(/^eq\./, ''));
        return send(200, row === undefined ? [] : [{ data: row }]);
      }
      if (req.method === 'POST' && url.pathname === '/rest/v1/app_documents') {
        const row = JSON.parse(body.toString());
        docs.set(row.id, row.data);
        return send(201, [row]);
      }
      if (req.method === 'GET' && url.pathname === '/storage/v1/bucket/uploads') {
        if (!bucketReady) return send(404, { message: 'Bucket not found', error: 'Bucket not found', statusCode: '404' });
        return send(200, { id: 'uploads', name: 'uploads', public: true });
      }
      if (req.method === 'POST' && url.pathname === '/storage/v1/bucket') {
        bucketReady = true;
        return send(200, { name: 'uploads' });
      }
      if (req.method === 'POST' && url.pathname.startsWith('/storage/v1/object/uploads/')) {
        const objectPath = decodeURIComponent(url.pathname.slice('/storage/v1/object/uploads/'.length));
        files.set(objectPath, { buf: body, type: req.headers['content-type'] || 'application/octet-stream' });
        return send(200, { Id: objectPath, Key: 'uploads/' + objectPath });
      }
      if (req.method === 'DELETE' && url.pathname === '/storage/v1/object/uploads') {
        const parsed = JSON.parse(body.toString() || '{}');
        for (const prefix of parsed.prefixes || []) files.delete(typeof prefix === 'string' ? prefix : prefix.path);
        return send(200, []);
      }
      if (req.method === 'GET' && url.pathname.startsWith('/storage/v1/object/public/uploads/')) {
        const objectPath = decodeURIComponent(url.pathname.slice('/storage/v1/object/public/uploads/'.length));
        const file = files.get(objectPath);
        if (!file) return send(404, 'missing', 'text/plain');
        return send(200, file.buf, file.type);
      }
      return send(500, { message: 'unhandled ' + req.method + ' ' + url.pathname });
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(err && err.stack || err));
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: 'http://127.0.0.1:' + port,
        docs,
        files,
        calls,
        close() {
          return new Promise(done => server.close(() => done()));
        }
      });
    });
  });
}

async function api(base, method, pathname, body) {
  const res = await fetch(base + pathname, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  return { status: res.status, data, text, headers: res.headers };
}

async function uploadPhoto(base, id, kind) {
  const fd = new FormData();
  fd.append('photo', new Blob([PNG], { type: 'image/png' }), 'shot.png');
  const res = await fetch(base + `/api/projects/${id}/photo?kind=${kind}`, { method: 'POST', body: fd });
  const data = await res.json();
  return { status: res.status, data };
}

test('refuses to start when only one Supabase env var is set', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./db.js')"], {
    cwd: ROOT,
    env: { ...process.env, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: '' }
  });
  assert.notStrictEqual(result.status, 0);
  assert.match(String(result.stderr), /both/i);
});

test('local files: projects, payments, photos, reports, and the other JSON stores', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kudo-local-'));
  const dataDir = path.join(dir, 'data');
  const uploadsDir = path.join(dir, 'uploads');
  const qrisFile = path.join(dir, 'qris.jpg');
  const port = await freePort();
  const env = { PORT: String(port), DATA_DIR: dataDir, UPLOADS_DIR: uploadsDir, QRIS_FILE: qrisFile };
  let app;
  app = await startApp(env);
  const base = 'http://127.0.0.1:' + port;
  try {
    assert.match(app.log(), /local files/);
    const home = await fetch(base + '/');
    assert.strictEqual(home.status, 200);
    assert.match(await home.text(), /Kudostack/);

    const seeded = await api(base, 'GET', '/api/projects');
    assert.strictEqual(seeded.status, 200);
    assert.deepStrictEqual(seeded.data.map(p => p.id), ['KDS-003', 'KDS-002', 'KDS-001']);

    const bad = await api(base, 'POST', '/api/projects', { nama: 'Tanpa PIC' });
    assert.strictEqual(bad.status, 400);

    const [first, second] = await Promise.all([
      api(base, 'POST', '/api/projects', { nama: 'Satu', layanan: 'Hardware', pic: 'Rizky', biaya: 100000 }),
      api(base, 'POST', '/api/projects', { nama: 'Dua', layanan: 'Software', pic: 'Dina', biaya: 200000 })
    ]);
    assert.strictEqual(first.status, 200);
    assert.strictEqual(second.status, 200);
    const ids = [first.data.id, second.data.id].sort();
    assert.deepStrictEqual(ids, ['KDS-004', 'KDS-005']);

    const created = await api(base, 'GET', '/api/projects');
    assert.strictEqual(created.data.length, 5);

    const lunas = await api(base, 'PUT', '/api/projects/' + first.data.id, { bayar: 'Lunas' });
    assert.strictEqual(lunas.status, 200);
    assert.strictEqual(lunas.data.bayar, 'Lunas');
    const trx = await api(base, 'GET', '/api/transactions');
    assert.ok(trx.data.some(t => t.ket.includes(first.data.id) && t.jenis === 'Uang Masuk' && t.nominal === 100000));

    const manual = await api(base, 'POST', '/api/transactions', { jenis: 'Uang Keluar', nominal: 5000, kategori: 'Operasional', pic: 'Dina', ket: 'tes' });
    assert.strictEqual(manual.status, 200);
    const removed = await api(base, 'DELETE', '/api/transactions/' + manual.data.id);
    assert.strictEqual(removed.status, 200);
    const trxAfter = await api(base, 'GET', '/api/transactions');
    assert.ok(!trxAfter.data.some(t => t.id === manual.data.id));

    const stats = await api(base, 'GET', '/api/stats');
    assert.strictEqual(stats.status, 200);
    assert.strictEqual(stats.data.months.length, 6);
    assert.ok(stats.data.uangMasuk >= 750000);

    const beforePdf = await fetch(base + '/api/pdf/project/' + second.data.id);
    const beforeBuf = Buffer.from(await beforePdf.arrayBuffer());
    assert.strictEqual(beforePdf.status, 200);
    assert.strictEqual(beforeBuf.subarray(0, 4).toString(), '%PDF');

    const photo = await uploadPhoto(base, second.data.id, 'in');
    assert.strictEqual(photo.status, 200);
    assert.match(photo.data.url, /^\/uploads\//);
    const stored = await fetch(base + photo.data.url);
    assert.strictEqual(stored.status, 200);
    assert.deepStrictEqual(Buffer.from(await stored.arrayBuffer()), PNG);

    const afterPdf = await fetch(base + '/api/pdf/project/' + second.data.id);
    const afterBuf = Buffer.from(await afterPdf.arrayBuffer());
    assert.strictEqual(afterBuf.subarray(0, 4).toString(), '%PDF');
    assert.ok(afterBuf.length > beforeBuf.length, 'PDF should embed the uploaded photo');

    for (const route of ['/api/pdf/projects', '/api/pdf/finance?periode=1m', '/api/pdf/master']) {
      const pdf = await fetch(base + route);
      const buf = Buffer.from(await pdf.arrayBuffer());
      assert.strictEqual(pdf.status, 200, route);
      assert.strictEqual(buf.subarray(0, 4).toString(), '%PDF', route);
    }

    const csv = await fetch(base + '/api/export/projects.csv');
    const csvText = await csv.text();
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(csvText, /KDS-001/);
    assert.match(csvText, /Servis Laptop ASUS ROG/);
    const trxCsv = await fetch(base + '/api/export/transactions.csv');
    assert.match(await trxCsv.text(), /TRX-001/);
    const projectsJson = await api(base, 'GET', '/api/export/projects.json');
    assert.ok(projectsJson.data.some(p => p.id === 'KDS-001'));
    const trxJson = await api(base, 'GET', '/api/export/transactions.json');
    assert.ok(trxJson.data.some(t => t.id === 'TRX-001'));

    const gonePhoto = await api(base, 'DELETE', `/api/projects/${second.data.id}/photo?kind=in&url=${encodeURIComponent(photo.data.url)}`);
    assert.strictEqual(gonePhoto.status, 200);
    assert.strictEqual((await fetch(base + photo.data.url)).status, 404);
    const afterDelete = (await api(base, 'GET', '/api/projects')).data.find(p => p.id === second.data.id);
    assert.deepStrictEqual(afterDelete.fotoIn, []);

    assert.strictEqual((await api(base, 'POST', '/api/login', { username: 'tidak-ada' })).status, 401);
    const login = await api(base, 'POST', '/api/login', { username: 'SuperAdmin' });
    assert.strictEqual(login.data.role, 'superadmin');
    const added = await api(base, 'POST', '/api/users', { actor: 'superadmin', username: 'Kasir', role: 'anggota' });
    assert.strictEqual(added.status, 200);
    assert.strictEqual(added.data.username, 'kasir');
    const users = await api(base, 'GET', '/api/users');
    assert.ok(users.data.some(u => u.username === 'kasir' && u.role === 'anggota'));
    assert.strictEqual((await api(base, 'DELETE', '/api/users/kasir?actor=superadmin')).status, 200);
    assert.ok(!(await api(base, 'GET', '/api/users')).data.some(u => u.username === 'kasir'));

    assert.strictEqual((await api(base, 'POST', '/api/plans', { actor: 'anggota', tanggal: '2026-11-12', judul: 'Nope' })).status, 403);
    const plan = await api(base, 'POST', '/api/plans', { actor: 'medsos', tanggal: '2026-11-12', judul: 'Before after', platform: 'Instagram' });
    assert.strictEqual(plan.status, 403);
    const planOk = await api(base, 'POST', '/api/plans', { actor: 'admin', tanggal: '2026-11-12', judul: 'Before after', platform: 'Instagram', caption: 'halo' });
    assert.strictEqual(planOk.status, 200);
    const planPut = await api(base, 'PUT', '/api/plans/' + planOk.data.id, { actor: 'admin', status: 'Terjadwal' });
    assert.strictEqual(planPut.data.status, 'Terjadwal');
    assert.strictEqual((await api(base, 'DELETE', '/api/plans/' + planOk.data.id + '?actor=admin')).status, 200);

    const pay = await api(base, 'PUT', '/api/paymeta?actor=admin', { an: 'Kudostack Uji', lokasi: { alamat: 'Jl. Uji', lat: -7.1, lng: 109.2, catatan: 'dekat' } });
    assert.strictEqual(pay.status, 200);
    const payGet = await api(base, 'GET', '/api/paymeta');
    assert.strictEqual(payGet.data.an, 'Kudostack Uji');
    assert.strictEqual(payGet.data.lokasi.alamat, 'Jl. Uji');
    assert.strictEqual(payGet.data.ewallet.length, 4);

    const qris = await api(base, 'POST', '/api/qris?actor=admin', { nama: 'KUDOSTACK UJI', nmid: 'NMID-1', tipe: 'Statis (selamanya)' });
    assert.strictEqual(qris.data.meta.nama, 'KUDOSTACK UJI');
    const qrisImg = await api(base, 'POST', '/api/qris/image?actor=admin', { image: 'data:image/png;base64,' + PNG.toString('base64') });
    assert.strictEqual(qrisImg.status, 200);
    const qrisGot = await fetch(base + '/qris.jpg?v=1');
    assert.deepStrictEqual(Buffer.from(await qrisGot.arrayBuffer()), PNG);

    const wa = await api(base, 'POST', '/api/send-wa', { to: '081234', message: 'Halo admin +62 851-6585-9837' });
    assert.strictEqual(wa.status, 200);
    const outbox = await api(base, 'GET', '/api/send-wa/outbox');
    assert.strictEqual(outbox.data[0].to, '081234');
    assert.strictEqual(outbox.data[0].footerIncluded, true);

    assert.strictEqual((await api(base, 'DELETE', '/api/projects/' + second.data.id)).status, 200);
    assert.strictEqual((await api(base, 'GET', '/api/nope')).status, 404);

    await app.stop();
    app = await startApp(env);
    const again = await api(base, 'GET', '/api/projects');
    assert.ok(again.data.some(p => p.id === first.data.id && p.bayar === 'Lunas'));
    assert.ok(!again.data.some(p => p.id === second.data.id));
    assert.ok(fs.existsSync(path.join(dataDir, 'db.json')));
    assert.ok(fs.existsSync(path.join(dataDir, 'users.json')));
  } finally {
    if (app) await app.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('supabase: same features persist in Postgres documents and Storage', async () => {
  const mock = await startSupabaseMock();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kudo-remote-'));
  const port = await freePort();
  const env = {
    PORT: String(port),
    DATA_DIR: path.join(dir, 'data'),
    UPLOADS_DIR: path.join(dir, 'uploads'),
    QRIS_FILE: path.join(dir, 'qris.jpg'),
    SUPABASE_URL: mock.url,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    SUPABASE_BUCKET: 'uploads'
  };
  let app;
  app = await startApp(env);
  const base = 'http://127.0.0.1:' + port;
  try {
    assert.match(app.log(), /supabase bucket uploads/);
    assert.ok(mock.calls.some(c => c.method === 'POST' && c.path === '/storage/v1/bucket'), 'creates the bucket when SQL has not yet');
    assert.ok(mock.calls.every(c => !c.apikey || c.apikey === SERVICE_KEY));
    assert.ok(mock.calls.some(c => c.authorization === 'Bearer ' + SERVICE_KEY));

    const home = await (await fetch(base + '/')).text();
    assert.ok(!home.includes(SERVICE_KEY));

    const seeded = await api(base, 'GET', '/api/projects');
    assert.strictEqual(seeded.data.length, 3);
    assert.ok(mock.docs.has('main'));
    assert.strictEqual(fs.existsSync(path.join(dir, 'data', 'db.json')), false);

    const created = await api(base, 'POST', '/api/projects', { nama: 'Remote', layanan: 'DLL', pic: 'Sinta', biaya: 125000, status: 'Menunggu Pembayaran' });
    assert.strictEqual(created.status, 200);
    const paid = await api(base, 'PUT', '/api/projects/' + created.data.id, { bayar: 'Lunas', status: 'Selesai / Closing' });
    assert.strictEqual(paid.data.bayar, 'Lunas');
    assert.ok(paid.data.garansiAkhir === '' || typeof paid.data.garansiAkhir === 'string');
    const trx = await api(base, 'GET', '/api/transactions');
    assert.ok(trx.data.some(t => t.ket.includes(created.data.id)));

    const beforePdf = Buffer.from(await (await fetch(base + '/api/pdf/project/' + created.data.id)).arrayBuffer());
    const photo = await uploadPhoto(base, created.data.id, 'out');
    assert.strictEqual(photo.status, 200);
    assert.match(photo.data.url, /^http:\/\/127\.0\.0\.1:\d+\/storage\/v1\/object\/public\/uploads\/photos\//);
    const stored = await fetch(photo.data.url);
    assert.strictEqual(stored.status, 200);
    assert.deepStrictEqual(Buffer.from(await stored.arrayBuffer()), PNG);
    const afterPdf = Buffer.from(await (await fetch(base + '/api/pdf/project/' + created.data.id)).arrayBuffer());
    assert.strictEqual(afterPdf.subarray(0, 4).toString(), '%PDF');
    assert.ok(afterPdf.length > beforePdf.length);

    const csv = await (await fetch(base + '/api/export/projects.csv')).text();
    assert.match(csv, /Remote/);
    const finance = Buffer.from(await (await fetch(base + '/api/pdf/finance?periode=all')).arrayBuffer());
    assert.strictEqual(finance.subarray(0, 4).toString(), '%PDF');

    await api(base, 'POST', '/api/users', { actor: 'superadmin', username: 'kasir', role: 'anggota' });
    const qrisImg = await api(base, 'POST', '/api/qris/image?actor=superadmin', { image: 'data:image/png;base64,' + PNG.toString('base64') });
    assert.strictEqual(qrisImg.status, 200);
    const qris = await fetch(base + '/qris.jpg');
    assert.deepStrictEqual(Buffer.from(await qris.arrayBuffer()), PNG);
    assert.ok(mock.docs.get('qris-meta').imageUrl.includes('/storage/v1/object/public/uploads/qris/current'));

    const removed = await api(base, 'DELETE', `/api/projects/${created.data.id}/photo?kind=out&url=${encodeURIComponent(photo.data.url)}`);
    assert.strictEqual(removed.status, 200);
    assert.strictEqual((await fetch(photo.data.url)).status, 404);
    assert.deepStrictEqual(mock.docs.get('main').projects.find(p => p.id === created.data.id).fotoOut, []);

    await app.stop();
    app = await startApp(env);
    const again = await api(base, 'GET', '/api/projects');
    assert.ok(again.data.some(p => p.id === created.data.id && p.nama === 'Remote'));
    const users = await api(base, 'GET', '/api/users');
    assert.ok(users.data.some(u => u.username === 'kasir'));
    assert.strictEqual(fs.existsSync(path.join(dir, 'data', 'db.json')), false);
  } finally {
    if (app) await app.stop();
    await mock.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('migrate-to-supabase imports db.json, side documents, uploads, and the QRIS image', async () => {
  const mock = await startSupabaseMock();
  const dataDir = path.join(ROOT, 'data');
  const uploadsDir = path.join(ROOT, 'uploads');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  const dbFile = path.join(dataDir, 'db.json');
  const usersFile = path.join(dataDir, 'users.json');
  const photo = path.join(uploadsDir, 'mig.png');
  fs.writeFileSync(dbFile, JSON.stringify({
    projects: [{
      id: 'KDS-009', tgl: '2026-11-01', nama: 'Migrasi', layanan: 'Hardware', pic: 'Rizky',
      klien: 'A', wa: '6281', biaya: 10, bayar: 'DP', status: 'Baru Masuk',
      input: '', output: '', fotoIn: ['/uploads/mig.png'], fotoOut: []
    }],
    transactions: [{ id: 'TRX-009', tgl: '2026-11-02', jenis: 'Uang Masuk', kategori: 'Hardware', nominal: 10, pic: 'Rizky', ket: 'migrasi' }],
    counters: { project: 10, trx: 10 }
  }, null, 2));
  fs.writeFileSync(usersFile, JSON.stringify([{ username: 'superadmin', role: 'superadmin', created: '2026-11-01' }]));
  fs.writeFileSync(photo, PNG);
  const result = await runNode(['scripts/migrate-to-supabase.js'], {
    ...process.env,
    SUPABASE_URL: mock.url,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    SUPABASE_BUCKET: 'uploads'
  });
  try {
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /1 projects/);
    assert.match(result.stdout, /1 photos/);
    const main = mock.docs.get('main');
    assert.strictEqual(main.projects[0].nama, 'Migrasi');
    assert.match(main.projects[0].fotoIn[0], /\/storage\/v1\/object\/public\/uploads\/photos\/mig\.png$/);
    assert.deepStrictEqual(mock.files.get('photos/mig.png').buf, PNG);
    assert.strictEqual(mock.docs.get('users')[0].username, 'superadmin');
    assert.match(mock.docs.get('qris-meta').imageUrl, /\/qris\/current$/);
    assert.ok(mock.files.has('qris/current'));
  } finally {
    fs.rmSync(dbFile, { force: true });
    fs.rmSync(usersFile, { force: true });
    fs.rmSync(photo, { force: true });
    await mock.close();
  }
});
