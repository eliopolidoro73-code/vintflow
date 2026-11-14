alter table users add column if not exists referral_code text;
alter table users add column if not exists referred_by text;

create table if not exists sourcing_lots (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  supplier text not null default 'Brocante / Grossiste',
  items_count integer not null default 1,
  items_sold integer not null default 0,
  total_cost numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  revenue_generated numeric(10,2) not null default 0,
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_sourcing_lots_user on sourcing_lots(user_id);

create table if not exists expenses (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  label text not null,
  category text not null default 'Emballage & Envoi',
  amount numeric(10,2) not null default 0,
  incurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_user on expenses(user_id);
