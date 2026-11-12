# Kudostack Admin Hub

Express admin app for projects, payments, photos, PDF reports, and CSV/JSON export.

## Local development

```bash
npm install
npm start
```

The process listens on `0.0.0.0:$PORT` (`PORT` defaults to 3000).

With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` unset, data stays in `data/db.json` (plus `data/users.json`, `plans.json`, `paymeta.json`, `qris-meta.json`, and `wa-outbox.json`) and photos stay in `uploads/`. Setting only one of those two variables is a mistake: the process refuses to start so it does not silently write to the wrong place.

## Deploy on Render (free) with Supabase

Render's free web service wipes the filesystem on every restart and sleeps after 15 minutes idle. Hosted mode stores the JSON documents in Supabase Postgres and photos in Supabase Storage.

1. Create a Supabase project on the free tier.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) once. That creates `public.app_documents` (RLS on, no anon access) and a public `uploads` bucket. If you want a different bucket name, edit the bucket id in that file before running it, and set `SUPABASE_BUCKET` to the same name.
3. In Supabase: Project Settings → API. Copy the project URL and the **service_role** key. Use that key only on the server. Do not put it in the browser, and do not use the anon / publishable key for this app.
4. Push this repo (the Blueprint is read from the default branch) and open [New Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Nizarjoe/Business-platform). `render.yaml` defines a free Node web service (`npm install` / `npm start`) on Node 22. When Render asks, fill in:
   - `SUPABASE_URL` — project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key
   - `SUPABASE_BUCKET` is already `uploads`
5. Apply the Blueprint. `/` is the health check and does not read the database. The first API call that loads projects seeds the sample projects and transactions when the `main` row is missing.

The service role bypasses RLS. The table grants nothing to `anon` or `authenticated`, so the Data API cannot read the documents with the public key. The storage bucket is public so project photos and a replaced QRIS image keep working in the browser and in PDF reports, the same way `/uploads` was public before.

### Move an existing `data/db.json`

From a machine that still has the local data directory:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
npm run migrate:supabase
```

The script upserts `data/db.json`, imports the other JSON files in `data/` when they exist, uploads referenced files from `uploads/`, and uploads `public/qris.jpg`. Running it again replaces those Supabase rows with the local files. Do this before the first hosted boot if you need the live data instead of the built-in seed (the app seeds only when the `main` row is missing; a later migration still overwrites that row).

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | for hosted mode | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | for hosted mode | Server-only service role key |
| `SUPABASE_BUCKET` | no | Storage bucket, default `uploads` |
| `PORT` | set by Render | HTTP port. Local default is 3000 |
