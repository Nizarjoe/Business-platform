#!/usr/bin/env node
/**
 * One-off import of the local JSON store and uploads/ into Supabase.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:supabase
 *
 * Optional: SUPABASE_BUCKET (default "uploads").
 * Reads data/db.json plus, when present, data/users.json, plans.json,
 * qris-meta.json, paymeta.json, and wa-outbox.json. Files in uploads/ that
 * are referenced as /uploads/<file> are uploaded and the saved URLs become
 * the public Storage URLs. public/qris.jpg is uploaded when that file exists.
 *
 * Re-running replaces those Supabase documents with the local files.
 */
const fs = require('fs');
const path = require('path');
const {
  save, saveDoc, uploadObject, usingRemote, initPersistence
} = require('../db');

const ROOT = path.join(__dirname, '..');

function mimeFor(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic' || ext === '.heif') return 'image/heic';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

async function rewritePhotos(db) {
  const uploads = path.join(ROOT, 'uploads');
  let uploaded = 0;
  let missing = 0;
  for (const project of db.projects || []) {
    for (const key of ['fotoIn', 'fotoOut']) {
      const next = [];
      for (const url of project[key] || []) {
        if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
          next.push(url);
          continue;
        }
        const filename = path.basename(url);
        const abs = path.join(uploads, filename);
        if (!filename || !fs.existsSync(abs)) {
          console.warn('Missing upload, left unchanged:', url);
          missing++;
          next.push(url);
          continue;
        }
        const publicUrl = await uploadObject(
          'photos/' + filename,
          fs.readFileSync(abs),
          mimeFor(filename)
        );
        next.push(publicUrl);
        uploaded++;
      }
      project[key] = next;
    }
  }
  return { uploaded, missing };
}

async function importOptionalDocs() {
  const docs = [
    ['users', 'users.json'],
    ['plans', 'plans.json'],
    ['qris-meta', 'qris-meta.json'],
    ['paymeta', 'paymeta.json'],
    ['wa-outbox', 'wa-outbox.json']
  ];
  const imported = [];
  for (const [id, file] of docs) {
    const abs = path.join(ROOT, 'data', file);
    if (!fs.existsSync(abs)) continue;
    await saveDoc(id, JSON.parse(fs.readFileSync(abs, 'utf8')));
    imported.push(file);
  }
  return imported;
}

async function importQrisImage() {
  const abs = path.join(ROOT, 'public', 'qris.jpg');
  if (!fs.existsSync(abs)) return false;
  const url = await uploadObject('qris/current', fs.readFileSync(abs), 'image/jpeg');
  const metaFile = path.join(ROOT, 'data', 'qris-meta.json');
  const meta = fs.existsSync(metaFile)
    ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    : { nama: 'KUDOSTACK, Service', nmid: 'ID1026635766458', tipe: 'Statis (selamanya)', diubah: '-', oleh: '-' };
  meta.imageUrl = url;
  await saveDoc('qris-meta', meta);
  return true;
}

async function main() {
  if (!usingRemote()) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run this again.');
    process.exit(1);
  }
  const dbFile = path.join(ROOT, 'data', 'db.json');
  if (!fs.existsSync(dbFile)) {
    console.error('No data/db.json to import.');
    process.exit(1);
  }
  await initPersistence();
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const photos = await rewritePhotos(db);
  await save(db);
  const docs = await importOptionalDocs();
  const qris = await importQrisImage();
  console.log(
    'Imported ' + (db.projects || []).length + ' projects, ' +
    (db.transactions || []).length + ' transactions, ' +
    photos.uploaded + ' photos' +
    (photos.missing ? ' (' + photos.missing + ' missing)' : '') + '.'
  );
  if (docs.length) console.log('Also imported ' + docs.join(', ') + '.');
  if (qris) console.log('Uploaded public/qris.jpg and saved its public URL on qris-meta.');
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
