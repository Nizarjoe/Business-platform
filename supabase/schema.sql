-- Kudostack Admin Hub — run once in the Supabase SQL editor.
-- Dashboard → SQL → New query → paste this file → Run.
--
-- The Express server connects with the service_role key, which bypasses RLS.
-- anon and authenticated have no grants and no policies on app data, so the
-- Data API cannot read or write these rows with the publishable/anon key.
--
-- Uploaded photos (and a replaced QRIS image) go in a public Storage bucket.
-- Public read matches the old /uploads static folder: the admin UI and PDF
-- reports load the files by URL. The server uploads with the service_role key.
--
-- If you set SUPABASE_BUCKET to a name other than "uploads", change the bucket
-- id in this file to that same name before running it.

create table if not exists public.app_documents (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_documents is
  'Kudostack JSON documents. id "main" is projects, transactions, and counters. Other ids: users, plans, qris-meta, paymeta, wa-outbox.';

alter table public.app_documents enable row level security;

revoke all on table public.app_documents from public, anon, authenticated;
grant select, insert, update, delete on table public.app_documents to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', true, 10485760)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- The bucket is public, so a photo URL loads in the browser and in PDF
-- reports without a token (the same exposure as the old /uploads folder).
-- There is intentionally no anon/authenticated policy on storage.objects:
-- a broad SELECT policy would also allow listing every object. Uploads and
-- deletes are done with the service_role key, which bypasses storage RLS.
drop policy if exists "Public read uploads" on storage.objects;
