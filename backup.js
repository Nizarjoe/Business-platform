// F8: D1 -> KV backups. Used by the app (POST /api/backups, list, download)
// and by the scheduled Worker in cf/backup-worker.mjs (Cron Trigger).
// No requires: the cron Worker bundles this file on its own.
const BACKUP_TABLES = ['projects', 'transactions', 'plans', 'users', 'settings', 'audit', 'app_documents'];
const PREFIX = 'backup/';
const RETENTION_DAYS = 14;
const DAY_S = 86400;

async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function existingTables(DB) {
  const r = await DB.prepare("select name from sqlite_master where type = 'table'").all();
  const have = new Set((r.results || []).map(x => x.name));
  return BACKUP_TABLES.filter(t => have.has(t));
}

// Snapshot every app table in one D1 batch (one transaction, so it is consistent).
// Sessions and rate limits are left out on purpose. The users rows hold password
// hashes, so the file is for superadmin only.
async function runBackup(DB, KV, trigger) {
  const tables = await existingTables(DB);
  const res = await DB.batch(tables.map(t => DB.prepare(`select * from ${t} order by rowid`)));
  const data = {};
  tables.forEach((t, i) => { data[t] = res[i].results || []; });
  const at = new Date().toISOString();
  const counts = Object.fromEntries(tables.map(t => [t, data[t].length]));
  const body = JSON.stringify({ format: 'business-platform-backup/1', at, trigger, counts, tables: data });
  const sha256 = await sha256Hex(body);
  const key = PREFIX + at.replace(/[:.]/g, '-') + '.json';
  const meta = { at, trigger, counts, bytes: body.length, sha256 };
  await KV.put(key, body, { expirationTtl: RETENTION_DAYS * DAY_S, metadata: meta });
  await prune(KV);
  return { key, ...meta };
}

// KV expires each backup after 14 days; prune is a second guard for keys
// written without a TTL.
async function prune(KV) {
  const cutoff = Date.now() - RETENTION_DAYS * DAY_S * 1000;
  for (const k of await listBackups(KV)) if (Date.parse(k.at) < cutoff) await KV.delete(k.key);
}

async function listBackups(KV) {
  const out = [];
  let cursor;
  do {
    const page = await KV.list({ prefix: PREFIX, cursor });
    for (const k of page.keys) out.push({ key: k.name, ...(k.metadata || {}), expiresAt: k.expiration ? new Date(k.expiration * 1000).toISOString() : null });
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out.sort((a, b) => String(b.key).localeCompare(String(a.key)));
}

const validKey = name => /^[0-9TZ-]+\.json$/.test(String(name || ''));

module.exports = { runBackup, listBackups, validKey, PREFIX, RETENTION_DAYS, BACKUP_TABLES };
