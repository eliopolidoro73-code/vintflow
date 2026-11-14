create table if not exists rate_limits (
  bucket text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);

create index if not exists idx_rate_limits_reset on rate_limits(reset_at);
