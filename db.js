const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const ADMIN_WA = '+62 851-6585-9837';

function load() {
  if (!fs.existsSync(DB_FILE)) {
    const seed = {
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
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

module.exports = { load, save, DB_FILE, ADMIN_WA };
