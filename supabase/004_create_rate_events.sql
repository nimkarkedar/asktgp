-- Rate limiting for /api/ask and /api/feedback. One row per request, keyed by
-- a salted SHA-256 of the client IP (the raw IP is never stored). Rows older
-- than 2 days are pruned by /api/ping. RLS on from birth; the app uses the
-- service role which bypasses RLS.

create table public.rate_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text        not null,
  ip_hash     text        not null
);

alter table public.rate_events enable row level security;
revoke all on public.rate_events from anon, authenticated;

create index rate_events_kind_ip_created_idx on public.rate_events(kind, ip_hash, created_at);
create index rate_events_kind_created_idx on public.rate_events(kind, created_at);
