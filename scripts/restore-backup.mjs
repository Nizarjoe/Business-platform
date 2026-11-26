// F8: turn a backup file into SQL for `wrangler d1 execute <db> --remote --file restore.sql`.
// Usage: node scripts/restore-backup.mjs backup.json > restore.sql
// Replaces every table found in the backup (sessions are not touched, so all
// users stay logged in until their sessions expire; delete them if needed).
// Apply migrations 0001-0003 first on an empty database.
import fs from 'node:fs';
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/restore-backup.mjs backup.json > restore.sql'); process.exit(1); }
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
if (b.format !== 'business-platform-backup/1') throw new Error('not a business-platform backup: ' + b.format);
const lit = v => v === null || v === undefined ? 'null' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
const out = [`-- restore of backup taken ${b.at} (${b.trigger || '-'})`];
for (const [t, rows] of Object.entries(b.tables)) {
  if (!/^[a-z_]+$/.test(t)) throw new Error('bad table name ' + t);
  if (rows.length !== b.counts[t]) throw new Error(`count mismatch in ${t}`);
  out.push(`delete from ${t};`);
  for (const r of rows) {
    const cols = Object.keys(r);
    out.push(`insert into ${t} (${cols.join(', ')}) values (${cols.map(c => lit(r[c])).join(', ')});`);
  }
}
process.stdout.write(out.join('\n') + '\n');
