-- Pack sizes (1, 5, 10, 20, 50 L) for each product, each with its own price
-- and SKU. Stock stays a single number per product, now in LITRES
-- (products.stock_quantity — existing values were 1 L bottles, so they're
-- already litres); a pack size is available while stock covers its volume.
--
-- The 1 L pack keeps the product's existing price and SKU, so products.price
-- remains "price per 1 L" and Google Merchant Center listing IDs don't change.

-- ── Pack sizes ───────────────────────────────────────────────────────────────
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_liters numeric not null check (size_liters > 0),
  price numeric not null check (price >= 0),
  sku text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size_liters)
);

create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

drop trigger if exists update_product_variants_updated_at on public.product_variants;
create trigger update_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.update_updated_at_column();

alter table public.product_variants enable row level security;

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;

drop policy if exists "Anyone can view active pack sizes of published products" on public.product_variants;
create policy "Anyone can view active pack sizes of published products" on public.product_variants
  for select using (
    is_active and exists (select 1 from public.products p where p.id = product_id and p.is_published)
  );

drop policy if exists "Product managers can view all pack sizes" on public.product_variants;
create policy "Product managers can view all pack sizes" on public.product_variants
  for select to authenticated using (
    public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')
    or public.has_permission(auth.uid(), 'products.manage')
  );

drop policy if exists "Product managers manage pack sizes" on public.product_variants;
create policy "Product managers manage pack sizes" on public.product_variants
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')
    or public.has_permission(auth.uid(), 'products.manage')
  )
  with check (
    public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin')
    or public.has_permission(auth.uid(), 'products.manage')
  );

-- Every product gets a 1 L pack from its current price and SKU.
insert into public.product_variants (product_id, size_liters, price, sku)
select id, 1, price, sku from public.products
on conflict (product_id, size_liters) do nothing;

-- Larger packs, priced per Becof's price list (October 2026).
insert into public.product_variants (product_id, size_liters, price, sku)
select p.id, v.size, v.price, case when p.sku is null then null else p.sku || '-' || v.size || 'L' end
from public.products p
join (values
  ('becof-nitrofix', 5, 14000), ('becof-nitrofix', 10, 28000), ('becof-nitrofix', 20, 56000), ('becof-nitrofix', 50, 140000),
  ('becof-trichoshield', 5, 14000), ('becof-trichoshield', 10, 28000), ('becof-trichoshield', 20, 56000), ('becof-trichoshield', 50, 140000),
  ('becof-rootmax', 5, 14000), ('becof-rootmax', 10, 28000), ('becof-rootmax', 20, 56000), ('becof-rootmax', 50, 140000),
  ('becof-soilfix', 5, 12500), ('becof-soilfix', 10, 25000), ('becof-soilfix', 20, 50000), ('becof-soilfix', 50, 125000)
) as v(slug, size, price) on v.slug = p.slug
on conflict (product_id, size_liters) do nothing;

-- Pack size changes alter public pages, the sitemap and the Merchant feed.
drop trigger if exists rebuild_site_on_change on public.product_variants;
create trigger rebuild_site_on_change
  after insert or update or delete on public.product_variants
  for each statement execute function public.request_site_rebuild();

-- ── Cart: one line per product + pack size ───────────────────────────────────
alter table public.cart_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete cascade;

-- Existing cart lines become the 1 L pack.
update public.cart_items c
set variant_id = v.id
from public.product_variants v
where c.variant_id is null and v.product_id = c.product_id and v.size_liters = 1;

-- A browser still running the previous version of the site adds to cart
-- without a pack size; default those to the 1 L pack instead of failing.
create or replace function public.cart_items_default_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.variant_id is null then
    select id into new.variant_id
    from public.product_variants
    where product_id = new.product_id and size_liters = 1;
  end if;
  return new;
end;
$$;

drop trigger if exists cart_items_default_variant on public.cart_items;
create trigger cart_items_default_variant
  before insert on public.cart_items
  for each row execute function public.cart_items_default_variant();

alter table public.cart_items drop constraint if exists cart_items_user_id_product_id_key;
alter table public.cart_items drop constraint if exists cart_items_user_product_variant_key;
alter table public.cart_items
  add constraint cart_items_user_product_variant_key unique (user_id, product_id, variant_id);

-- ── Orders: record the pack bought ───────────────────────────────────────────
alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists pack_size_liters numeric;

-- ── Low stock alerts now count litres ────────────────────────────────────────
create or replace function public.check_low_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock_quantity <= new.low_stock_threshold and old.stock_quantity > old.low_stock_threshold then
    insert into public.admin_notifications (type, title, message, metadata) values (
      'low_stock', 'Low Stock Alert: ' || new.name,
      'Product "' || new.name || '" has ' || new.stock_quantity || ' litres remaining.',
      jsonb_build_object('product_id', new.id, 'stock_quantity', new.stock_quantity));
  end if;
  if new.stock_quantity = 0 and old.stock_quantity > 0 then
    new.is_published := false;
    insert into public.admin_notifications (type, title, message, metadata) values (
      'out_of_stock', 'Out of Stock: ' || new.name,
      'Product "' || new.name || '" is now out of stock and has been automatically unpublished.',
      jsonb_build_object('product_id', new.id));
  end if;
  return new;
end;
$$;