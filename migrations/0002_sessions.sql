-- F1: server-side sessions and login rate limiting. Additive only.
create table if not exists sessions (
  token_hash text primary key,
  username text not null,
  expires_at integer not null
);
create index if not exists sessions_username on sessions (username);
create table if not exists rate_limits (
  key text primary key,
  count integer not null,
  reset_at integer not null
);
