alter table users add column if not exists ai_credits_used integer not null default 0;
alter table users add column if not exists crosslist_used integer not null default 0;
