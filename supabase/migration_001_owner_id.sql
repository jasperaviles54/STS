-- Migration 001: Add per-user data ownership for sandboxed demo accounts.
--
-- Apply this ONLY if you already ran the original schema.sql before the
-- owner_id column existed. Fresh installs should just run schema.sql.
--
-- Step 1: replace the placeholder below with your real account's user UUID.
--   Supabase Dashboard → Authentication → Users → click your row → copy "ID".
-- Step 2: paste the whole file into the SQL editor and run.

-- ===== EDIT THIS LINE =====
do $$ begin perform set_config('app.primary_user', '6431079a-24bb-4b14-abb1-6e64d393c129', false); end $$;
-- ==========================

alter table products add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table sales    add column if not exists owner_id uuid references auth.users(id) on delete cascade;

update products set owner_id = current_setting('app.primary_user')::uuid where owner_id is null;
update sales    set owner_id = current_setting('app.primary_user')::uuid where owner_id is null;

alter table products alter column owner_id set not null;
alter table sales    alter column owner_id set not null;
alter table products alter column owner_id set default auth.uid();
alter table sales    alter column owner_id set default auth.uid();

alter table products drop constraint if exists products_name_key;
alter table products add  constraint products_owner_name_key unique (owner_id, name);

create index if not exists products_owner_idx on products (owner_id);
create index if not exists sales_owner_idx    on sales    (owner_id);

drop policy if exists "auth read products"  on products;
drop policy if exists "auth write products" on products;
drop policy if exists "auth read sales"     on sales;
drop policy if exists "auth write sales"    on sales;

create policy "owner read products"  on products
  for select to authenticated using (owner_id = auth.uid());
create policy "owner write products" on products
  for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner read sales"     on sales
  for select to authenticated using (owner_id = auth.uid());
create policy "owner write sales"    on sales
  for all    to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
