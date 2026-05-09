-- Sales Tracking System schema (canonical, fresh install)
-- Run once in the Supabase SQL editor.
--
-- Each row is owned by the user who created it (`owner_id`). RLS ensures
-- a user can only see and modify their own rows, so a "demo" user can be
-- created safely without exposing or polluting the real owner's data.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  purchasing_price numeric(10,2) not null check (purchasing_price >= 0),
  selling_price    numeric(10,2) not null check (selling_price    >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  sold_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx    on sales (sold_at);
create index if not exists sales_product_id_idx on sales (product_id);
create index if not exists products_owner_idx   on products (owner_id);
create index if not exists sales_owner_idx      on sales (owner_id);

alter table products enable row level security;
alter table sales    enable row level security;

drop policy if exists "auth read products"   on products;
drop policy if exists "auth write products"  on products;
drop policy if exists "auth read sales"      on sales;
drop policy if exists "auth write sales"     on sales;
drop policy if exists "owner read products"  on products;
drop policy if exists "owner write products" on products;
drop policy if exists "owner read sales"     on sales;
drop policy if exists "owner write sales"    on sales;

create policy "owner read products"  on products
  for select to authenticated using (owner_id = auth.uid());
create policy "owner write products" on products
  for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner read sales"     on sales
  for select to authenticated using (owner_id = auth.uid());
create policy "owner write sales"    on sales
  for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
