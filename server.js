const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { load, save, ADMIN_WA } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const uniq = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${req.params.id || 'x'}-${uniq}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS));

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
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const seed = [
      { username: 'superadmin', role: 'superadmin', created: new Date().toISOString().slice(0, 10) },
      { username: 'admin', role: 'admin', created: new Date().toISOString().slice(0, 10) }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
const saveUsers = u => fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));

app.post('/api/login', (req, res) => {
  const { username } = req.body || {};
  const u = getUsers().find(x => x.username.toLowerCase() === String(username || '').trim().toLowerCase());
  if (!u) return res.status(401).json({ error: 'Username tidak ditemukan' });
  res.json({ ok: true, username: u.username, role: u.role });
});
app.get('/api/users', (req, res) => res.json(getUsers().map(({ username, role, created }) => ({ username, role, created }))));
app.post('/api/users', (req, res) => {
  const { actor, username, role } = req.body || {};
  const actorU = getUsers().find(x => x.username === actor);
  if (!actorU || actorU.role !== 'superadmin') return res.status(403).json({ error: 'Hanya superadmin bisa menambah user' });
  const name = String(username || '').trim().toLowerCase();
  if (!name) return res.status(400).json({ error: 'Username wajib diisi' });
  const us = getUsers();
  if (us.find(x => x.username === name)) return res.status(409).json({ error: 'Username sudah dipakai' });
  const nu = { username: name, role: ['superadmin','admin','anggota','medsos','customer'].includes(role) ? role : 'anggota', created: new Date().toISOString().slice(0, 10) };
  us.push(nu); saveUsers(us); res.json(nu);
});
app.delete('/api/users/:username', (req, res) => {
  const actorU = getUsers().find(x => x.username === req.query.actor);
  if (!actorU || actorU.role !== 'superadmin') return res.status(403).json({ error: 'Hanya superadmin bisa hapus user' });
  const name = req.params.username.toLowerCase();
  if (name === 'superadmin') return res.status(400).json({ error: 'Superadmin utama tidak boleh dihapus' });
  let us = getUsers();
  if (!us.find(x => x.username === name)) return res.status(404).json({ error: 'User tidak ditemukan' });
  saveUsers(us.filter(x => x.username !== name));
  res.json({ ok: true });
});

/* ================= PROJECTS ================= */
app.get('/api/projects', (req, res) => {
  const db = load();
  res.json(db.projects.sort((a, b) => b.id.localeCompare(a.id)));
});

app.post('/api/projects', (req, res) => {
  const db = load();
  const b = req.body || {};
  if (!b.nama || !b.layanan || !b.pic) return res.status(400).json({ error: 'Nama, layanan, dan PIC wajib diisi' });
  const tgl = new Date().toISOString().slice(0, 10);
  const p = {
    id: 'KDS-' + String(db.counters.project++).padStart(3, '0'),
    tgl, nama: b.nama, layanan: b.layanan,
    pic: b.pic, klien: b.klien || '-', wa: (b.wa || '').replace(/\D/g, ''),
    biaya: Number(b.biaya || 0), bayar: b.bayar || 'Belum Bayar', status: b.status || 'Baru Masuk',
    input: b.input || '', output: b.output || '',
    diagnosis: b.diagnosis || '', reportTeknisi: b.reportTeknisi || '',
    garansiNum: Number(b.garansiNum || 0), garansiUnit: b.garansiUnit || 'bulan', garansiAkhir: '',
    signature: b.signature || null,
    fotoIn: [], fotoOut: []
  };
  if (p.status === 'Selesai / Closing' && p.garansiNum > 0)
    p.garansiAkhir = addPeriode(tgl, p.garansiNum, p.garansiUnit);
  db.projects.push(p); save(db); res.json(p);
});

app.put('/api/projects/:id', (req, res) => {
  const db = load();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  const prevBayar = p.bayar, prevStatus = p.status;
  Object.assign(p, req.body);
  p.biaya = Number(p.biaya || 0);
  p.garansiNum = Number(p.garansiNum || 0);
  // garansi mulai berlalu saat closing
  if (p.status === 'Selesai / Closing' && prevStatus !== 'Selesai / Closing' && p.garansiNum > 0 && !p.garansiAkhir)
    p.garansiAkhir = addPeriode(new Date().toISOString().slice(0, 10), p.garansiNum, p.garansiUnit);
  if (p.status !== 'Selesai / Closing') p.garansiAkhir = '';
  if (prevBayar !== 'Lunas' && p.bayar === 'Lunas') {
    db.transactions.push({
      id: 'TRX-' + String(db.counters.trx++).padStart(3, '0'),
      tgl: new Date().toISOString().slice(0, 10),
      jenis: 'Uang Masuk',
      kategori: p.layanan === 'DLL' ? 'DLL' : p.layanan,
      nominal: p.biaya, pic: p.pic,
      ket: `Pembayaran lunas ${p.id} — ${p.nama}`
    });
  }
  save(db); res.json(p);
});

app.delete('/api/projects/:id', (req, res) => {
  const db = load();
  const i = db.projects.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  db.projects.splice(i, 1); save(db); res.json({ ok: true });
});

app.delete('/api/projects/:id/photo', (req, res) => {
  const db = load();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  const url = String(req.query.url || '');
  const kind = req.query.kind === 'out' ? 'fotoOut' : 'fotoIn';
  p[kind] = (p[kind] || []).filter(u => u !== url);
  save(db);
  try { const abs = path.join(__dirname, url.replace(/^\/+/, '')); if (abs.startsWith(UPLOADS) && fs.existsSync(abs)) fs.unlinkSync(abs); } catch (e) {}
  res.json({ ok: true });
});

app.post('/api/projects/:id/photo', upload.single('photo'), (req, res) => {
  const db = load();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
  const kind = req.query.kind === 'out' ? 'fotoOut' : 'fotoIn';
  p[kind].push('/uploads/' + req.file.filename);
  save(db); res.json({ url: '/uploads/' + req.file.filename, kind });
});

/* ================= TRANSACTIONS ================= */
app.get('/api/transactions', (req, res) => {
  const db = load();
  let t = db.transactions.slice().reverse();
  const { dari, sampai } = req.query;
  if (dari) t = t.filter(x => x.tgl >= dari);
  if (sampai) t = t.filter(x => x.tgl <= sampai);
  res.json(t);
});
app.post('/api/transactions', (req, res) => {
  const db = load();
  const { tgl, jenis, kategori, nominal, pic, ket } = req.body || {};
  if (!jenis || !nominal) return res.status(400).json({ error: 'Jenis dan nominal wajib' });
  const t = {
    id: 'TRX-' + String(db.counters.trx++).padStart(3, '0'),
    tgl: tgl || new Date().toISOString().slice(0, 10),
    jenis, kategori: kategori || 'Operasional',
    nominal: Number(nominal), pic: pic || '-', ket: ket || ''
  };
  db.transactions.push(t); save(db); res.json(t);
});
app.delete('/api/transactions/:id', (req, res) => {
  const db = load();
  const i = db.transactions.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Tidak ditemukan' });
  db.transactions.splice(i, 1); save(db); res.json({ ok: true });
});

/* ================= STATS (+ omzet + chart series) ================= */
app.get('/api/stats', (req, res) => {
  const db = load();
  const ps = db.projects, trx = db.transactions;
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
    uangMasuk: inSum, uangKeluar: outSum, saldo: inSum - outSum,
    omzet: ps.filter(p => p.bayar === 'Lunas').reduce((s, p) => s + p.biaya, 0),
    piutang: ps.filter(p => p.bayar !== 'Lunas').reduce((s, p) => s + p.biaya, 0),
    layanan: { Hardware: byLayanan('Hardware'), Software: byLayanan('Software'), DLL: byLayanan('DLL') },
    statusCount, months
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
    doc.image(path.join(__dirname, 'public', 'logo.jpg'), 62, 47, { fit: [150, 60] });
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

app.get('/api/pdf/project/:id', (req, res) => {
  const db = load();
  const p = db.projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
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
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#7a4b8f').text(k, 50, doc.y);
    doc.font('Helvetica').fontSize(9.5).fillColor(C.ink).text(String(v || '-'), 220, doc.y - 12, { width: 325 });
    doc.moveDown(0.35);
  });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#7a4b8f').text('Dokumentasi Foto');
  doc.moveDown(0.4);
  const w = 225, h = 155;
  const drawFoto = (arr, label, soft) => {
    (arr || []).forEach((u, i) => {
      if (doc.y + h + 26 > 760) { doc.addPage(); doc.y = 70; }
      const yFoto = doc.y;
      doc.roundedRect(50, yFoto, w, h, 8).fill(soft);
      try { doc.image(path.join(__dirname, u), 50, yFoto, { fit: [w, h] }); } catch (e) {}
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

app.get('/api/pdf/projects', (req, res) => {
  const db = load();
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
    doc.moveDown(0.5);
  });
  footerNote(doc); doc.end();
});

app.get('/api/pdf/finance', (req, res) => {
  const db = load();
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

app.get('/api/pdf/master', (req, res) => {
  const db = load();
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

app.get('/api/export/projects.csv', (req, res) => {
  const db = load();
  const H = ['ID', 'Tanggal', 'Nama Proyek', 'Layanan', 'PIC', 'Klien', 'No WA', 'Biaya', 'Status Bayar', 'Status Pengerjaan',
    'Input dari Klien', 'Diagnosis Awal', 'Output / Hasil', 'Laporan Teknisi', 'Garansi (angka)', 'Garansi (satuan)', 'Garansi Berlaku s.d.',
    'Jumlah Foto Masuk', 'Jumlah Foto Closing', 'Ada Tanda Tangan'];
  sendCsv(res, 'Kudostack-Proyek-Lengkap.csv', H, db.projects.map(p => [
    p.id, p.tgl, p.nama, p.layanan, p.pic, p.klien, p.wa, p.biaya, p.bayar, p.status,
    p.input, p.diagnosis, p.output, p.reportTeknisi, p.garansiNum, p.garansiUnit, p.garansiAkhir,
    (p.fotoIn || []).length, (p.fotoOut || []).length, p.signature ? 'ya' : 'tidak'
  ]));
});

app.get('/api/export/transactions.csv', (req, res) => {
  const db = load();
  const H = ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'PIC Keuangan', 'Keterangan'];
  sendCsv(res, 'Kudostack-Keuangan-Lengkap.csv', H,
    db.transactions.slice().sort((a, b) => a.tgl.localeCompare(b.tgl))
      .map(t => [t.id, t.tgl, t.jenis, t.kategori, t.nominal, t.pic, t.ket]));
});

app.get('/api/export/projects.json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="Kudostack-Proyek-Lengkap.json"');
  res.json(load().projects);
});
app.get('/api/export/transactions.json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="Kudostack-Keuangan-Lengkap.json"');
  res.json(load().transactions);
});

/* ================= KIRIM WA ================= */
const WA_OUTBOX = path.join(__dirname, 'data', 'wa-outbox.json');
app.post('/api/send-wa', (req, res) => {
  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ error: 'Nomor tujuan & pesan wajib' });
  const outbox = fs.existsSync(WA_OUTBOX) ? JSON.parse(fs.readFileSync(WA_OUTBOX, 'utf8')) : [];
  const item = {
    id: 'WA-' + Date.now(), to: String(to).replace(/\D/g, ''), message,
    footerIncluded: message.includes('+62 851-6585-9837'),
    createdAt: new Date().toISOString(), status: 'queued'
  };
  outbox.push(item);
  fs.writeFileSync(WA_OUTBOX, JSON.stringify(outbox, null, 2));
  res.json({ ok: true, id: item.id, note: 'Masuk antrean kirim WA server (outbox).' });
});
app.get('/api/send-wa/outbox', (req, res) => {
  res.json(fs.existsSync(WA_OUTBOX) ? JSON.parse(fs.readFileSync(WA_OUTBOX, 'utf8')) : []);
});

/* ================= CONTENT PLANNER (kalender konten medsos) ================= */
const PLANS_FILE = path.join(__dirname, 'data', 'plans.json');
function getPlans() {
  if (!fs.existsSync(PLANS_FILE)) fs.writeFileSync(PLANS_FILE, '[]');
  return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf8'));
}
const savePlans = p => fs.writeFileSync(PLANS_FILE, JSON.stringify(p, null, 2));

app.get('/api/plans', (req, res) => res.json(getPlans()));
app.post('/api/plans', (req, res) => {
  const { actor, tanggal, judul, platform, brief, prompt, caption } = req.body || {};
  const actorU = getUsers().find(x => x.username === actor);
  if (!actorU || !['superadmin', 'admin', 'medsos'].includes(actorU.role))
    return res.status(403).json({ error: 'Hanya superadmin/admin/medsos bisa kelola konten' });
  if (!tanggal || !judul) return res.status(400).json({ error: 'Tanggal & judul wajib' });
  const plans = getPlans();
  const item = {
    id: 'CP-' + Date.now(),
    tanggal, judul, platform: platform || 'Instagram',
    brief: brief || '', prompt: prompt || '', caption: caption || '',
    status: 'Draft', dibuat: actor || '-', createdAt: new Date().toISOString()
  };
  plans.push(item); savePlans(plans); res.json(item);
});
app.put('/api/plans/:id', (req, res) => {
  const actorU = getUsers().find(x => x.username === (req.body || {}).actor);
  if (!actorU || !['superadmin', 'admin', 'medsos'].includes(actorU.role))
    return res.status(403).json({ error: 'Tidak punya akses' });
  const plans = getPlans();
  const p = plans.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Tidak ditemukan' });
  const allow = ['tanggal', 'judul', 'platform', 'brief', 'prompt', 'caption', 'status'];
  allow.forEach(k => { if (req.body[k] !== undefined) p[k] = req.body[k]; });
  savePlans(plans); res.json(p);
});
app.delete('/api/plans/:id', (req, res) => {
  const actorU = getUsers().find(x => x.username === req.query.actor);
  if (!actorU || !['superadmin', 'admin', 'medsos'].includes(actorU.role))
    return res.status(403).json({ error: 'Tidak punya akses' });
  savePlans(getPlans().filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));
app.listen(PORT, () => console.log(`Kudostack Admin Hub running on http://localhost:${PORT}`));
