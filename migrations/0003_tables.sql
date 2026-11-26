-- S7/F6: one row per record instead of one JSON document. Additive only:
-- app_documents stays as it is (frozen after the switch) for rollback.
-- The app switches when settings.storage = 'tables' (see db.js storageMode()).
create table if not exists projects (
  id text primary key,
  data text not null,
  nama text, status text, bayar text, layanan text, pic text, tgl text
);
create index if not exists projects_status on projects (status);
create index if not exists projects_tgl on projects (tgl);
create table if not exists transactions (
  id text primary key,
  data text not null,
  tgl text, jenis text, kategori text, nominal integer
);
create index if not exists transactions_tgl on transactions (tgl);
create table if not exists plans (
  id text primary key,
  data text not null,
  tanggal text, status text
);
create table if not exists users (
  username text primary key,
  data text not null,
  role text
);
create table if not exists settings (
  key text primary key,
  value text not null
);
create table if not exists audit (
  id integer primary key autoincrement,
  ts text not null,
  actor text,
  action text not null,
  target text,
  detail text
);
create index if not exists audit_ts on audit (ts);
