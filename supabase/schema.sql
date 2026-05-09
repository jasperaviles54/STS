-- Sales Tracking System schema
-- Run once in the Supabase SQL editor.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  purchasing_price numeric(10,2) not null check (purchasing_price >= 0),
  selling_price    numeric(10,2) not null check (selling_price    >= 0),
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  sold_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx    on sales (sold_at);
create index if not exists sales_product_id_idx on sales (product_id);

alter table products enable row level security;
alter table sales    enable row level security;

drop policy if exists "auth read products"  on products;
drop policy if exists "auth write products" on products;
drop policy if exists "auth read sales"     on sales;
drop policy if exists "auth write sales"    on sales;

create policy "auth read products"  on products for select to authenticated using (true);
create policy "auth write products" on products for all    to authenticated using (true) with check (true);
create policy "auth read sales"     on sales    for select to authenticated using (true);
create policy "auth write sales"    on sales    for all    to authenticated using (true) with check (true);
