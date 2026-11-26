// S7/F6: Cloudflare D1 storage with one row per record.
// db.js calls into this module only when settings.storage = 'tables'.
//
// Concurrency: every write batch first moves settings.ver from the version it
// read to a fresh one; all other statements in the batch only apply when ver
// equals that fresh value. D1 runs a batch as one transaction, so a writer that
// lost the race changes nothing and retries, the same compare-and-swap rule the
// document mode used, but only changed rows are written.
const crypto = globalThis.crypto;

const TABLES = {
  projects: { key: 'id', cols: ['nama', 'status', 'bayar', 'layanan', 'pic', 'tgl'] },
  transactions: { key: 'id', cols: ['tgl', 'jenis', 'kategori', 'nominal'] },
  plans: { key: 'id', cols: ['tanggal', 'status'] },
  users: { key: 'username', cols: ['role'] }
};
// Document id -> where it lives. 'main' spans two tables plus a setting.
const ROW_DOCS = { users: 'users', plans: 'plans' };
const settingKey = id => 'doc:' + id;
const VER_GUARD = "(select value from settings where key = 'ver')";

const newVersion = () => new Date().toISOString() + '#' + Math.random().toString(36).slice(2, 10);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
async function sha256(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const colValue = v => (v === undefined || v === null ? null : typeof v === 'object' ? JSON.stringify(v) : v);

function makeStore(DB) {
  const rows = (res) => res.results || [];

  async function read(id) {
    if (id === 'main') {
      const [p, t, s] = await DB.batch([
        DB.prepare('select data from projects order by rowid'),
        DB.prepare('select data from transactions order by rowid'),
        DB.prepare("select key, value from settings where key in ('counters', 'ver')")
      ]);
      const set = Object.fromEntries(rows(s).map(r => [r.key, r.value]));
      if (set.counters === undefined) return { data: undefined, ver: set.ver || null };
      return {
        data: {
          projects: rows(p).map(r => JSON.parse(r.data)),
          transactions: rows(t).map(r => JSON.parse(r.data)),
          counters: JSON.parse(set.counters)
        },
        ver: set.ver || null
      };
    }
    if (ROW_DOCS[id]) {
      const [r, v] = await DB.batch([
        DB.prepare(`select data from ${ROW_DOCS[id]} order by rowid`),
        DB.prepare("select value from settings where key = 'ver'")
      ]);
      const list = rows(r).map(x => JSON.parse(x.data));
      return { data: list.length ? list : undefined, ver: rows(v)[0] ? rows(v)[0].value : null };
    }
    const r = await DB.prepare("select key, value from settings where key in (?1, 'ver')").bind(settingKey(id)).all();
    const set = Object.fromEntries(rows(r).map(x => [x.key, x.value]));
    return { data: set[settingKey(id)] === undefined ? undefined : JSON.parse(set[settingKey(id)]), ver: set.ver || null };
  }

  function upsertRow(table, item, ver) {
    const def = TABLES[table];
    const names = [def.key, 'data', ...def.cols];
    const vals = [String(item[def.key]), JSON.stringify(item), ...def.cols.map(c => colValue(item[c]))];
    const ph = names.map((_, i) => '?' + (i + 1));
    return DB.prepare(
      `insert into ${table} (${names.join(', ')}) select ${ph.join(', ')} where ${VER_GUARD} = ?${names.length + 1} ` +
      `on conflict(${def.key}) do update set ${names.slice(1).map(n => `${n} = excluded.${n}`).join(', ')}`
    ).bind(...vals, ver);
  }
  const deleteRow = (table, key, ver) =>
    DB.prepare(`delete from ${table} where ${TABLES[table].key} = ?1 and ${VER_GUARD} = ?2`).bind(key, ver);
  const putSetting = (key, value, ver) =>
    DB.prepare(`insert into settings (key, value) select ?1, ?2 where ${VER_GUARD} = ?3 on conflict(key) do update set value = excluded.value`)
      .bind(key, JSON.stringify(value), ver);

  function diffRows(table, before, after, ver, out) {
    const key = TABLES[table].key;
    const old = new Map((before || []).map(x => [String(x[key]), JSON.stringify(x)]));
    const seen = new Set();
    for (const item of after || []) {
      const k = String(item[key]);
      seen.add(k);
      if (old.get(k) !== JSON.stringify(item)) out.push(upsertRow(table, item, ver));
    }
    for (const k of old.keys()) if (!seen.has(k)) out.push(deleteRow(table, k, ver));
  }

  function diff(id, before, after, ver) {
    const out = [];
    if (id === 'main') {
      diffRows('projects', before && before.projects, after.projects, ver, out);
      diffRows('transactions', before && before.transactions, after.transactions, ver, out);
      if (!before || JSON.stringify(before.counters) !== JSON.stringify(after.counters)) out.push(putSetting('counters', after.counters, ver));
    } else if (ROW_DOCS[id]) {
      diffRows(ROW_DOCS[id], before, after, ver, out);
    } else if (!before || JSON.stringify(before) !== JSON.stringify(after)) {
      out.push(putSetting(settingKey(id), after, ver));
    }
    return out;
  }

  // step(data) -> { store, result }, same contract as db.js cfUpdate.
  async function update(id, fallback, step) {
    for (let attempt = 0; attempt < 15; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 15 + Math.random() * 40 * attempt));
      const { data: current, ver } = await read(id);
      const before = clone(current);
      let data = current;
      if (data === undefined || data === null) data = typeof fallback === 'function' ? fallback() : clone(fallback);
      const { store, result } = await step(data);
      const next = newVersion();
      const writes = diff(id, before, store, next);
      if (!writes.length) return { store, result };
      const bump = ver === null
        ? DB.prepare("insert into settings (key, value) values ('ver', ?1) on conflict(key) do nothing").bind(next)
        : DB.prepare("update settings set value = ?1 where key = 'ver' and value = ?2").bind(next, ver);
      const res = await DB.batch([bump, ...writes]);
      if (res[0].meta.changes === 1) return { store, result };
    }
    throw new Error('Data sedang diubah bersamaan, coba lagi');
  }

  async function appendAudit(entry) {
    await DB.prepare('insert into audit (ts, actor, action, target, detail) values (?1, ?2, ?3, ?4, ?5)')
      .bind(entry.ts, entry.actor || null, entry.action, entry.target || null, JSON.stringify(entry.detail || null)).run();
  }
  async function listAudit(limit) {
    const r = await DB.prepare('select id, ts, actor, action, target, detail from audit order by id desc limit ?1').bind(limit).all();
    return rows(r).map(x => ({ ...x, detail: x.detail ? JSON.parse(x.detail) : null }));
  }

  /* ---------- one-time copy from app_documents (S7) ----------
     Runs only while settings.storage = 'migrate'. Batch A copies every document
     into the tables, guarded by the exact updated_at of every app_documents row;
     the copy is read back and compared (counts + SHA-256 of the JSON); batch B
     flips storage to 'tables' under the same guard and stamps app_documents
     updated_at with '#migrated' so any in-flight document-mode write fails its
     compare-and-swap and retries in table mode. */
  async function migrate() {
    const docs = rows(await DB.prepare('select id, data, updated_at from app_documents order by id').all());
    const src = Object.fromEntries(docs.map(d => [d.id, JSON.parse(d.data)]));
    const versions = JSON.stringify(docs.map(d => d.id + '|' + d.updated_at));
    const guard = "(select value from settings where key = 'storage') = 'migrate' and (select count(*) from app_documents) = ?2 " +
      "and (select count(*) from app_documents where id || '|' || updated_at in (select value from json_each(?3))) = ?2";
    const main = src.main;
    if (main) {
      const extra = Object.keys(main).filter(k => !['projects', 'transactions', 'counters'].includes(k));
      if (extra.length) throw new Error('main has unknown keys: ' + extra.join(','));
    }
    for (const id of Object.keys(src)) {
      if (id === 'sessions') throw new Error('sessions document in D1 is unexpected');
      if ((id === 'users' || id === 'plans') && !Array.isArray(src[id])) throw new Error(id + ' is not a list');
    }
    const migrationId = newVersion();
    const stmts = [];
    const g = (sql, first) => DB.prepare(sql).bind(first, docs.length, versions);
    for (const t of Object.keys(TABLES)) stmts.push(g(`delete from ${t} where ?1 = ?1 and ${guard}`, t));
    const copy = (table, list) => {
      const def = TABLES[table];
      const cols = [def.key, 'data', ...def.cols];
      const exprs = [`json_extract(value, '$.${def.key}')`, 'value', ...def.cols.map(c => `json_extract(value, '$.${c}')`)];
      stmts.push(g(`insert into ${table} (${cols.join(', ')}) select ${exprs.join(', ')} from json_each(?1) where ${guard}`,
        JSON.stringify(list.map(x => JSON.stringify(x)))));
    };
    if (main) { copy('projects', main.projects || []); copy('transactions', main.transactions || []); }
    if (src.users) copy('users', src.users);
    if (src.plans) copy('plans', src.plans);
    const settings = [['ver', migrationId], ['migration-id', migrationId]];
    if (main) settings.push(['counters', JSON.stringify(main.counters)]);
    for (const id of Object.keys(src)) if (!['main', 'users', 'plans'].includes(id)) settings.push([settingKey(id), JSON.stringify(src[id])]);
    stmts.push(g(`delete from settings where key <> 'storage' and ?1 = ?1 and ${guard}`, 'x'));
    stmts.push(g(`insert into settings (key, value) select json_extract(value, '$[0]'), json_extract(value, '$[1]') from json_each(?1) where ${guard}`,
      JSON.stringify(settings)));
    await DB.batch(stmts);
    const mine = await DB.prepare("select value from settings where key = 'migration-id'").first();
    if (!mine || mine.value !== migrationId) return { ok: false, reason: 'documents changed during copy, retry' };

    // Read back through the table reader and compare with the source documents.
    const report = { at: new Date().toISOString(), migrationId, docs: {} };
    let same = true;
    for (const d of docs) {
      const back = (await read(d.id)).data;
      const want = src[d.id];
      const count = v => (d.id === 'main' ? { projects: v.projects.length, transactions: v.transactions.length } : Array.isArray(v) ? v.length : 1);
      const a = await sha256(JSON.stringify(want)), b = back === undefined ? null : await sha256(JSON.stringify(back));
      // An empty users/plans list reads back as "no rows" (undefined); that is the same data.
      const emptyList = Array.isArray(want) && !want.length && back === undefined;
      const match = a === b || emptyList;
      report.docs[d.id] = { source: count(want), table: back === undefined ? 0 : count(back), sha256Source: a, sha256Table: b, match };
      if (!match) same = false;
    }
    report.match = same;
    if (!same) {
      await DB.prepare("update settings set value = 'migrate-failed' where key = 'storage' and value = 'migrate'").run();
      await DB.prepare("insert into settings (key, value) values ('migration-report', ?1) on conflict(key) do update set value = excluded.value").bind(JSON.stringify(report)).run();
      return { ok: false, reason: 'verification failed', report };
    }
    const flip = await DB.batch([
      g(`insert into settings (key, value) select 'migration-report', ?1 where ${guard} on conflict(key) do update set value = excluded.value`, JSON.stringify(report)),
      g(`update settings set value = 'tables' where key = 'storage' and ?1 = ?1 and ${guard}`, 'x'),
      DB.prepare("update app_documents set updated_at = updated_at || '#migrated' where (select value from settings where key = 'storage') = 'tables' and (select value from settings where key = 'migration-id') = ?1").bind(migrationId)
    ]);
    if (flip[1].meta.changes !== 1) return { ok: false, reason: 'documents changed before switch, retry' };
    return { ok: true, report };
  }

  return { read, update, migrate, appendAudit, listAudit };
}

module.exports = { makeStore, sha256, TABLES };
