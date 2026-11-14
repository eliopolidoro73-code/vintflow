create table if not exists revoked_tokens (
  jti text primary key,
  expires_at timestamptz not null
);

create index if not exists idx_revoked_tokens_expires on revoked_tokens(expires_at);
