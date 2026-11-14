create table if not exists app_config (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  plan text not null default 'starter',
  billing_cycle text not null default 'monthly',
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  company_name text not null default 'Mon Dressing Pro',
  siret text not null default '912 345 678 00014',
  fiscal_regime text not null default 'micro_bic',
  urssaf_rate numeric(5,2) not null default 12.30,
  vat_threshold integer not null default 85000,
  auto_crosslist boolean not null default false,
  auto_delist boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists connected_accounts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  platform text not null,
  handle text not null,
  status text not null default 'connected',
  listings_count integer not null default 0,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_connected_accounts_user on connected_accounts(user_id);

create table if not exists inventory_items (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  sku text not null,
  title text not null,
  brand text not null default '',
  category text not null default 'Vêtements',
  size text not null default 'M',
  condition text not null default 'Très bon état',
  location text not null default 'Étagère A1',
  purchase_price numeric(10,2) not null default 0,
  extra_costs numeric(10,2) not null default 0,
  listing_price numeric(10,2) not null default 0,
  status text not null default 'active',
  vinted_status text not null default 'listed',
  leboncoin_status text not null default 'not_listed',
  tiktok_status text not null default 'not_listed',
  ebay_status text not null default 'not_listed',
  vinted_account text not null default '@charles_resell',
  description_vinted text not null default '',
  description_lbc text not null default '',
  image_color text not null default '#0f766e',
  listed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_user on inventory_items(user_id);

create table if not exists sales (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  item_id text references inventory_items(id) on delete set null,
  invoice_number text not null,
  platform text not null,
  account_handle text not null,
  item_title text not null,
  sku text not null default '',
  buyer_name text not null,
  buyer_city text not null default 'Paris',
  carrier text not null default 'Mondial Relay',
  tracking_code text not null default '',
  shipment_status text not null default 'to_ship',
  gross_amount numeric(10,2) not null,
  purchase_cost numeric(10,2) not null default 0,
  platform_fees numeric(10,2) not null default 0,
  boost_cost numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  urssaf_amount numeric(10,2) not null default 0,
  net_margin numeric(10,2) not null default 0,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_user on sales(user_id);

create table if not exists messages (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  platform text not null,
  account_handle text not null,
  buyer_name text not null,
  item_title text not null,
  item_price numeric(10,2) not null default 0,
  last_message text not null,
  reply_text text,
  unread boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_user on messages(user_id);
