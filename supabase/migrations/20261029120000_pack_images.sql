-- Optional image per pack size, so choosing a size shows that pack (e.g. the
-- RootMax 5 kg pouch). When null, the product's own image is used.

alter table public.product_variants add column if not exists image_url text;

comment on column public.product_variants.image_url is 'Image of this pack size; falls back to the product image when null';

update public.product_variants v
set image_url = '/images/products/becof-rootmax-5kg.jpg'
from public.products p
where v.product_id = p.id and p.slug = 'becof-rootmax' and v.size_liters = 5;
