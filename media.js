// Project documentation (photos and videos).
// Cloudflare: metadata in the D1 table project_media (migration 0004), bytes in
// the FILES KV namespace as media/<id>/<n>, one key per CHUNK bytes (a KV value
// may be at most 25 MiB; 8 MiB keeps each upload request and the Worker's
// memory small). Local/dev: a "project-media" document and DATA_DIR/media/<id>/<n>.
// R2 can later hold the bytes instead of KV: only putChunk/readChunk/dropBlobs change.
const fs = require('fs');
const path = require('path');

const CHUNK = 8 * 1024 * 1024;
const LIMITS = { foto: 15 * 1024 * 1024, video: 100 * 1024 * 1024 };
const TYPES = { 'image/jpeg': 'foto', 'image/png': 'foto', 'image/webp': 'foto', 'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video' };
const STALE_MS = 24 * 60 * 60 * 1000;

// Type from the first bytes only; the name and the browser's claim are not trusted.
function sniffMedia(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  if (b.slice(4, 8).toString('latin1') === 'ftyp') return b.slice(8, 12).toString('latin1') === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  return null;
}

// Single range "bytes=a-b", "bytes=a-", "bytes=-n". null = whole file, 'bad' = 416.
function parseRange(h, size) {
  if (!h) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(h).trim());
  if (!m) return null; // multi-range or junk: answer with the whole file
  let s, e;
  if (m[1] === '') { if (m[2] === '') return 'bad'; s = Math.max(0, size - Number(m[2])); e = size - 1; }
  else { s = Number(m[1]); e = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (!(s <= e) || s >= size) return 'bad';
  return { s, e };
}
// Which chunk keys and byte offsets cover [s, e] (inclusive).
function segments(id, s, e, chunkSize = CHUNK) {
  const out = [];
  for (let i = Math.floor(s / chunkSize); i <= Math.floor(e / chunkSize); i++) {
    const base = i * chunkSize;
    out.push({ n: i, k: `media/${id}/${i}`, s: Math.max(s, base) - base, e: Math.min(e, base + chunkSize - 1) - base + 1 });
  }
  return out;
}

function makeMedia({ cf, loadDoc, updateDoc, dataDir, remoteOnlyOther }) {
  const DB = cf && cf.DB, KV = cf && cf.FILES;
  const enabled = () => !!cf || !remoteOnlyOther();
  const localDir = id => path.join(dataDir, 'media', String(id).replace(/[^A-Za-z0-9_-]/g, ''));
  const fromRow = r => r && ({ id: r.id, projectId: r.project_id, kind: r.kind, type: r.type, name: r.name, size: r.size, chunks: r.chunks, chunkSize: r.chunk_size, caption: r.caption || '', tgl: r.tgl || '', by: r.by_user, at: r.created_at, status: r.status });
  const docList = async () => (await loadDoc('project-media')) || [];

  async function list(projectId) {
    if (DB) return ((await DB.prepare("select * from project_media where project_id = ?1 and status = 'ready' order by tgl desc, created_at desc").bind(projectId).all()).results || []).map(fromRow);
    return (await docList()).filter(m => m.projectId === projectId && m.status === 'ready')
      .sort((a, b) => (b.tgl + b.at).localeCompare(a.tgl + a.at));
  }
  async function counts() {
    try {
      if (DB) return Object.fromEntries(((await DB.prepare("select project_id, count(*) as n from project_media where status = 'ready' group by project_id").all()).results || []).map(r => [r.project_id, r.n]));
      const c = {};
      for (const m of await docList()) if (m.status === 'ready') c[m.projectId] = (c[m.projectId] || 0) + 1;
      return c;
    } catch (e) { return {}; } // table not there yet (migration 0004 not applied)
  }
  async function get(id) {
    if (DB) return fromRow(await DB.prepare('select * from project_media where id = ?1').bind(id).first());
    return (await docList()).find(m => m.id === id) || null;
  }
  async function insert(m) {
    if (DB) {
      await DB.prepare('insert into project_media (id, project_id, kind, type, name, size, chunks, chunk_size, caption, tgl, by_user, created_at, status) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)')
        .bind(m.id, m.projectId, m.kind, m.type, m.name, m.size, m.chunks, m.chunkSize, m.caption, m.tgl, m.by, m.at, m.status).run();
      return;
    }
    await updateDoc('project-media', () => [], l => [...(Array.isArray(l) ? l : []), m]);
  }
  async function setReady(id) {
    if (DB) return (await DB.prepare("update project_media set status = 'ready' where id = ?1 and status = 'uploading'").bind(id).run()).meta.changes === 1;
    let ok = false;
    await updateDoc('project-media', () => [], l => l.map(m => (m.id === id && m.status === 'uploading' ? (ok = true, { ...m, status: 'ready' }) : m)));
    return ok;
  }
  async function update(id, { caption, tgl }) {
    if (DB) return DB.prepare('update project_media set caption = ?2, tgl = ?3 where id = ?1').bind(id, caption, tgl).run();
    await updateDoc('project-media', () => [], l => l.map(m => (m.id === id ? { ...m, caption, tgl } : m)));
  }
  async function putChunk(id, n, buf) {
    if (KV) return KV.put(`media/${id}/${n}`, buf);
    fs.mkdirSync(localDir(id), { recursive: true });
    fs.writeFileSync(path.join(localDir(id), String(n)), buf);
  }
  async function chunkCount(id) {
    if (KV) {
      let n = 0, cursor;
      do { const r = await KV.list({ prefix: `media/${id}/`, cursor }); n += r.keys.length; cursor = r.list_complete ? null : r.cursor; } while (cursor);
      return n;
    }
    return fs.existsSync(localDir(id)) ? fs.readdirSync(localDir(id)).length : 0;
  }
  async function readChunk(id, n) {
    if (KV) { const v = await KV.get(`media/${id}/${n}`, 'arrayBuffer'); return v ? Buffer.from(v) : null; }
    const f = path.join(localDir(id), String(n));
    return fs.existsSync(f) ? fs.readFileSync(f) : null;
  }
  async function dropBlobs(m) {
    if (KV) { for (let i = 0; i < m.chunks; i++) await KV.delete(`media/${m.id}/${i}`); return; }
    fs.rmSync(localDir(m.id), { recursive: true, force: true });
  }
  async function remove(m) {
    await dropBlobs(m);
    if (DB) await DB.prepare('delete from project_media where id = ?1').bind(m.id).run();
    else await updateDoc('project-media', () => [], l => l.filter(x => x.id !== m.id));
  }
  async function forProject(projectId, includeUploading) {
    if (DB) return ((await DB.prepare('select * from project_media where project_id = ?1').bind(projectId).all()).results || []).map(fromRow).filter(m => includeUploading || m.status === 'ready');
    return (await docList()).filter(m => m.projectId === projectId && (includeUploading || m.status === 'ready'));
  }
  // Uploads that never finished (browser closed) are removed after a day.
  async function dropStale(projectId) {
    const cut = new Date(Date.now() - STALE_MS).toISOString();
    for (const m of await forProject(projectId, true)) if (m.status === 'uploading' && m.at < cut) await remove(m);
  }
  async function removeProject(projectId) {
    for (const m of await forProject(projectId, true)) await remove(m);
  }
  return { enabled, list, counts, get, insert, setReady, update, putChunk, chunkCount, readChunk, remove, dropStale, removeProject, localDir };
}

module.exports = { makeMedia, sniffMedia, parseRange, segments, CHUNK, LIMITS, TYPES };
