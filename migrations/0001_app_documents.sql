-- Same shape as supabase/schema.sql: one JSON document per id.
-- id "main" = projects, transactions, counters. Others: users, plans, qris-meta, paymeta, wa-outbox.
create table if not exists app_documents (
  id text primary key,
  data text not null,
  updated_at text not null
);
