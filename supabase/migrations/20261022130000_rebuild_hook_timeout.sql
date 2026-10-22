-- Vercel takes ~7s to answer a deploy hook call, longer than pg_net's 5s
-- default, so the request was abandoned before Vercel queued the build.
-- Already applied to the database directly; recorded here so the repo matches.

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
    perform net.http_post(url := hook_url, body := '{}'::jsonb, timeout_milliseconds := 30000);
  end if;
  return null;
end;
$$;

revoke all on function public.request_site_rebuild() from public, anon, authenticated;
