-- Project documentation (photos/videos) and the full activity log. Additive only.
-- Media bytes live in the FILES KV namespace as media/<id>/<chunk> (8 MiB chunks);
-- this table holds the metadata. R2 can replace the KV chunks later without
-- changing the table (see README "Dokumentasi proyek").
create table if not exists project_media (
  id text primary key,
  project_id text not null,
  kind text not null,          -- foto | video
  type text not null,          -- checked from the file's first bytes
  name text not null,
  size integer not null,
  chunks integer not null,
  chunk_size integer not null,
  caption text,
  tgl text,
  by_user text not null,
  created_at text not null,
  status text not null         -- uploading | ready
);
create index if not exists project_media_project on project_media (project_id, status);
-- Activity log: the F3 audit table gets the columns every entry now carries.
alter table audit add column role text;
alter table audit add column entity text;
alter table audit add column summary text;
alter table audit add column ip text;
create index if not exists audit_actor on audit (actor);
create index if not exists audit_action on audit (action);
