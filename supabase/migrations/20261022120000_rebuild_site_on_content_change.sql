-- Rebuild the website when public content changes, so the pre-rendered pages,
-- sitemap, llms.txt and Merchant Center feed (scripts/prerender.mjs) stay
-- current without anyone having to remember to redeploy.
--
-- Calls a Vercel Deploy Hook stored in Supabase Vault. Until that secret
-- exists this is a no-op. To enable, create the hook in Vercel
-- (Project → Settings → Git → Deploy Hooks, branch: main) and run once:
--
--   select vault.create_secret('<deploy hook URL>', 'vercel_deploy_hook_url');

create extension if not exists pg_net with schema extensions;

create or replace function public.request_site_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hook_url text;
begin
  -- Sales change stock_quantity on every order; only rebuild for products
  -- when something a visitor or crawler actually sees has changed — including
  -- stock crossing zero, which flips availability in the structured data.
  if tg_table_name = 'products' and tg_op = 'UPDATE' then
    if (old.name, old.slug, old.short_description, old.long_description, old.usage_instructions,
        old.specifications, old.price, old.compare_at_price, old.images, old.is_published,
        old.is_featured, old.category_id, old.sku, old.safety_sheet_url, old.stock_quantity > 0)
       is not distinct from
       (new.name, new.slug, new.short_description, new.long_description, new.usage_instructions,
        new.specifications, new.price, new.compare_at_price, new.images, new.is_published,
        new.is_featured, new.category_id, new.sku, new.safety_sheet_url, new.stock_quantity > 0)
    then
      return null;
    end if;
  end if;

  select decrypted_secret into hook_url
  from vault.decrypted_secrets
  where name = 'vercel_deploy_hook_url'
  limit 1;

  if hook_url is not null then
    perform net.http_post(url := hook_url, body := '{}'::jsonb);
  end if;
  return null;
end;
$$;

revoke all on function public.request_site_rebuild() from public, anon, authenticated;

-- Statement-level where there's no column filter, so a bulk edit triggers one
-- rebuild rather than one per row.
do $$
declare
  t text;
begin
  foreach t in array array[
    'learn_articles', 'learn_categories', 'categories', 'partner_profiles',
    'job_positions', 'impact_metrics', 'esg_reports', 'impact_awards', 'product_reviews'
  ] loop
    execute format('drop trigger if exists rebuild_site_on_change on public.%I', t);
    execute format(
      'create trigger rebuild_site_on_change after insert or update or delete on public.%I
       for each statement execute function public.request_site_rebuild()', t);
  end loop;
end;
$$;

drop trigger if exists rebuild_site_on_change on public.products;
create trigger rebuild_site_on_change
  after insert or update or delete on public.products
  for each row execute function public.request_site_rebuild();
