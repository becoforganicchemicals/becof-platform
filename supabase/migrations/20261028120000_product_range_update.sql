-- October 2026 product range update.
--
-- 1. Products are sold in their own unit: litres (L), kilograms (kg) or grams
--    (g). products.unit says which; product_variants.size_liters and
--    order_items.pack_size_liters hold the pack size IN THAT UNIT (the column
--    names predate kg/g packs), and products.stock_quantity is stock in it.
-- 2. New prices, pack sizes, images and descriptions for all five products.
--    The 5–50 L packs are withdrawn.

-- ── Units ────────────────────────────────────────────────────────────────────
alter table public.products
  add column if not exists unit text not null default 'L'
  check (unit in ('L', 'kg', 'g'));

comment on column public.products.unit is 'Unit for pack sizes and stock: L, kg or g';
comment on column public.product_variants.size_liters is 'Pack size in the product''s unit (products.unit)';
comment on column public.order_items.pack_size_liters is 'Pack size in the product''s unit at the time of the order';

-- Low stock alerts name the product's own unit
create or replace function public.check_low_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock_quantity <= new.low_stock_threshold and old.stock_quantity > old.low_stock_threshold then
    insert into public.admin_notifications (type, title, message, metadata) values (
      'low_stock', 'Low Stock Alert: ' || new.name,
      'Product "' || new.name || '" has ' || new.stock_quantity || ' ' || new.unit || ' remaining.',
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

-- Rebuild the site when a product's unit changes too (latest version of this
-- function, from 20261022130000, with `unit` added to the compared columns)
create or replace function public.request_site_rebuild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hook_url text;
begin
  if tg_table_name = 'products' and tg_op = 'UPDATE' then
    if (old.name, old.slug, old.short_description, old.long_description, old.usage_instructions,
        old.specifications, old.price, old.compare_at_price, old.images, old.is_published,
        old.is_featured, old.category_id, old.sku, old.safety_sheet_url, old.unit, old.stock_quantity > 0)
       is not distinct from
       (new.name, new.slug, new.short_description, new.long_description, new.usage_instructions,
        new.specifications, new.price, new.compare_at_price, new.images, new.is_published,
        new.is_featured, new.category_id, new.sku, new.safety_sheet_url, new.unit, new.stock_quantity > 0)
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

-- ── Pack sizes: withdraw the old 5–50 L packs ────────────────────────────────
-- Cart lines for them are removed by ON DELETE CASCADE; past orders keep their
-- name and price (order_items.variant_id is set to null). Safe to re-run: the
-- packs being kept (including NitroFix's 100 g, once converted) are excluded.
delete from public.product_variants v
using public.products p
where v.product_id = p.id
  and p.slug in ('becof-trichoshield', 'becof-soilfix', 'becof-neemshield')
  and v.size_liters <> 1;

delete from public.product_variants v
using public.products p
where v.product_id = p.id and p.slug = 'becof-nitrofix' and v.size_liters not in (1, 100);

delete from public.product_variants v
using public.products p
where v.product_id = p.id and p.slug = 'becof-rootmax' and v.size_liters not in (1, 5);

-- ── Products ─────────────────────────────────────────────────────────────────

-- NeemShield: 1 L, KES 2,325
update public.products set
  unit = 'L',
  price = 2325,
  images = array['/images/products/becof-neemshield.jpg'],
  short_description = $t$Neem-based botanical insecticide, miticide and nematicide (Azadirachtin 0.03% EC) for whitefly, aphids, thrips, spider mites, nematodes and more.$t$,
  long_description = $t$Becof NeemShield™ is a neem-oil-based botanical insecticide, miticide, nematicide and pest repellent. It contains Azadirachtin 0.03% EC (300 ppm) together with other limonoids and triterpenoids — meliantriol, salannin and nimbin.

Mode of action
NeemShield works in several ways at once: it acts as an antifeedant, a repellent, an oviposition (egg-laying) deterrent, an insect growth regulator and a sterilant.

Target pests
NeemShield controls a wide range of pests on many crops, including but not limited to: whitefly, aphids, thrips, bollworm, cutworm, leafhoppers, leaf miners, spider mites, weevils, parasitic nematodes, desert locusts and scales.$t$,
  usage_instructions = $t$Mixing
Add water to NeemShield — do NOT add NeemShield to water. Stir well to get a good emulsion.

Foliar spray
3 litres per hectare (about 1.2 litres per acre). Apply the spray fluid targeting the pests directly.

Drench
5 to 8 litres per hectare (about 2 to 3.2 litres per acre).$t$
where slug = 'becof-neemshield';

update public.product_variants v set price = 2325
from public.products p where v.product_id = p.id and p.slug = 'becof-neemshield' and v.size_liters = 1;

-- RootMax: granules, 1 kg KES 2,100 and 5 kg KES 10,000
update public.products set
  unit = 'kg',
  price = 2100,
  images = array['/images/products/becof-rootmax.jpg'],
  short_description = $t$Granular mycorrhiza biofertilizer that builds a stronger root system for better water and nutrient uptake, drought resistance and plant health.$t$,
  long_description = $t$Becof RootMax™ is a granular biofertilizer containing mycorrhiza fungi. It is made using all forms of mycorrhiza — ecto and endo spores, mycelium, and root particles with vesicles — in a single formulation.

Mode of action
After application near the root zone, the spores activate and form a network of filaments that make a symbiotic association with the plant's roots. The fungi receive sugars from the roots, and in return help the plant absorb more water, macronutrients and micronutrients in a form it can use easily. This association also makes plants more resistant to drought.

Advantages
- Develops a tertiary root system, increasing the area for nutrient and water absorption in the root zone.
- Reduces the need for fertilizer.
- Increases drought resistance.
- Increases pathogen resistance and improves plant immunity.
- Improves overall plant health.

Useful for
All types of cereals, pulses, vegetables, tubers, fibre crops, ornamentals, oil seeds and fruit crops, as well as garden plants, shrubs and potted plants.

Texture: granules. Pack sizes: 1 kg and 5 kg.$t$,
  usage_instructions = $t$Dosage
- Maize, rice, wheat, barley and other grains: 1 to 2 kg per acre.
- Tomato, pepper, chilli, French beans, other beans and other crops: 4 to 5 kg per acre.

Method of application
Apply at planting. RootMax can be mixed with other planting fertilizers and applied while preparing the land. Use as per agronomist advice.

Storage
Store in a dry place, away from direct heat and sunlight.$t$
where slug = 'becof-rootmax';

update public.product_variants v set price = 2100
from public.products p where v.product_id = p.id and p.slug = 'becof-rootmax' and v.size_liters = 1;
update public.product_variants v set price = 10000, sku = p.sku || '-5KG'
from public.products p where v.product_id = p.id and p.slug = 'becof-rootmax' and v.size_liters = 5;

-- NitroFix: 100 g bean inoculant, KES 1,950. Stock moves from litre bottles
-- to grams: 1 bottle → 1 pack, so the same number of packs stays in stock.
-- (Converted only once: on a re-run the unit is already 'g'.)
update public.products set
  stock_quantity = case when unit = 'g' then stock_quantity else stock_quantity * 100 end,
  unit = 'g',
  price = 1950,
  low_stock_threshold = 2000,
  images = array['/images/products/becof-nitrofix.jpg'],
  short_description = $t$Rhizobium inoculant for dry beans and kidney beans. One 100 g pack coats the seed for one acre — gum arabic adhesive included.$t$,
  long_description = $t$Becof NitroFix™ Beans Inoculant (100 g) — includes free gum arabic adhesive for professional seed coating.

Are your dry beans or kidney beans giving you poor yields? Do you apply expensive top-dressing fertilizers only to watch them wash away with the rain? Your beans have a secret superpower: they can capture nitrogen from the air. But they need specific rhizobium bacteria to form root nodules. Without these bacteria, your beans starve for nitrogen — the plants stay yellow and the pods stay small.

Becof NitroFix™ contains a highly concentrated powder of live rhizobium bacteria specifically formulated for common dry beans and kidney beans. When you coat your seeds with NitroFix before planting, the bacteria attach to the emerging roots, form nodules and start pulling nitrogen from the air. Your plants grow faster, greener and more productive.

Every 100 g pack comes with a complimentary 30 g sachet of gum arabic adhesive, so the inoculant sticks perfectly to your seeds. No waste, no uneven coverage, and no need to buy a separate sticker.

Product highlights
- Superior yields through natural nitrogen fixation: the live rhizobium bacteria form healthy root nodules that convert atmospheric nitrogen into a form your beans can use. One acre of inoculated beans can fix 50 to 100 kilograms of nitrogen per season.
- Cost savings on nitrogen fertilizers: with NitroFix inoculation you can reduce or eliminate CAN and urea top-dressing. Apply only a starter dose of DAP or NPK at planting and let the bacteria supply the rest.
- All-in-one kit: the included 30 g gum arabic adhesive coats every seed evenly. One pack, everything you need.
- Crop resilience for drier seasons: inoculated bean plants develop more extensive root networks that reach water deeper in the soil, so your crop survives dry spells better.
- Improved grain quality for better prices: well-nodulated plants produce plump, uniform grains with excellent colour.
- Safe and easy to use: NitroFix contains no chemicals and is harmless to humans, animals and beneficial insects. Coating takes only a few minutes per acre.
- Long-term soil health: rhizobium bacteria improve soil biology. Each season you inoculate, the bacterial population in your soil grows.

Why dry beans and kidney beans need inoculation
Beans are legumes, like peas, cowpeas and groundnuts, and live in partnership with rhizobium bacteria in their root nodules, where nitrogen from the air is converted into ammonia the plant uses to make proteins and chlorophyll. But the strain that works best with dry beans is not present in all soils — especially fields that have not grown beans recently. Inoculation puts a high concentration of the right strain directly on the seed, so nodules form early and the plants never experience nitrogen stress.

NitroFix compared with CAN or urea
- Nitrogen source: free from the air (NitroFix) vs manufactured and energy-intensive.
- Application: once at planting vs several times per season.
- Risk of leaching: none vs high — rain washes nitrogen away.
- Soil health: improves soil biology long term vs can acidify soil over time.
- Grain yield increase: 20 to 40 percent vs 10 to 20 percent when used alone.
- Nodulation: abundant pink nodules vs few or no nodules.
The two work best together: a small starter dose of DAP or NPK at planting for phosphorus, and NitroFix for nitrogen.

Storage and handling
Unopened packs: store in a cool, dry place away from direct sunlight, ideally below 25°C, and away from chemicals, fertilizers and strong-smelling products. Stored correctly, an unopened pack remains viable for 6 to 12 months.
Opened packs: use the entire pack at once — once opened, the bacteria die within a few days. Plan to use the whole 100 g pack on one acre.
Transport: keep the pack out of the sun and never leave it in a hot car. The gum arabic adhesive is stable and needs no special handling.

Frequently asked questions
Can I use NitroFix on cowpeas or green grams? NitroFix Beans is formulated for common dry beans and kidney beans. For other legumes, ask us about crop-specific inoculants.
Is the 30 g of gum arabic enough for one acre? Yes — mixed with 250 ml of water it makes enough adhesive for 15 to 25 kg of bean seed.
Can I mix NitroFix with fungicides or insecticides? Do not mix them directly — many pesticides kill the bacteria. If you must treat seed with a fungicide, apply it first, let it dry completely, then apply NitroFix.
Will NitroFix work in dry conditions? The bacteria need moisture to move from the seed to the root. Water adequately after planting; in a dry spell, irrigate immediately after planting.
How soon will I see results? Healthier, greener plants within 2 to 3 weeks of emergence. At 3 to 4 weeks, dig up a plant: pink or red nodules on the roots show active nitrogen fixation.
Can I use NitroFix on organic farms? Yes. NitroFix contains only natural, live bacteria and is approved for use in organic farming systems. The gum arabic adhesive is a natural product from acacia trees.$t$,
  usage_instructions = $t$Step 1: Gather your materials
- Becof NitroFix™ Beans Inoculant (100 g pack) and the 30 g gum arabic sachet included in the pack.
- Bean seed for one acre (about 15 to 25 kg, depending on variety).
- A clean plastic bucket or basin — never metal, which can kill the live bacteria.
- Clean, non-chlorinated water at room temperature (borehole, well or rain water; tap water must stand open for 24 hours first).
- A measuring cup, gloves (recommended), and a clean sack or plastic sheet for drying.

Step 2: Prepare the gum arabic adhesive
Pour the 30 g sachet into a clean container, add 250 ml (one cup) of clean, room-temperature water and stir until fully dissolved. Let it stand for 5 minutes. Never use hot water — heat kills the bacteria.

Step 3: Moisten the seeds
Put the seed in the plastic bucket and add the adhesive little by little, stirring constantly, until every seed is slightly damp with no liquid pooling at the bottom. One acre of seed takes about 200 to 250 ml of adhesive. Do not over-wet the seed.

Step 4: Add the NitroFix powder
Sprinkle the whole 100 g pack evenly over the moistened seed and mix for 2 to 3 minutes until every seed has a uniform coating. Uneven coating means uneven nodulation.

Step 5: Dry the coated seeds
Spread the seed in a thin layer on a clean sack or plastic sheet in a cool, shaded, well-ventilated place — never in direct sunlight. Dry for 10 to 15 minutes, until the coating is dry to the touch but not hard.

Step 6: Plant immediately
Plant the inoculated seed straight away — within 4 hours at most. If you cannot plant everything at once, keep the seed in the shade under a moist sack.

Step 7: Follow good agronomic practices
- Plant 3 to 5 cm deep, in rows 45 to 60 cm apart with 10 to 15 cm between plants.
- Water adequately after planting so the bacteria can reach the emerging roots.
- Apply a starter dose of DAP or NPK at planting (50 to 100 kg per acre), placed below or beside the seed — not mixed with it.
- Do not apply nitrogen fertilizer after planting: extra nitrogen stops the plant forming nodules.
- Keep the crop weed-free, especially in the first 4 to 6 weeks.

Crucial warnings
- Do not mix inoculated seed with chemical fertilizers in the same container.
- Do not expose inoculated seed to direct sunlight.
- Do not use hot or chlorinated water.
- Do not store leftover inoculated seed — discard any not planted within 4 hours.
- Do not use expired inoculant; check the manufacturing date on the pack.
- Do not mix NitroFix with chemical seed treatments. If you must use one, apply it first and let it dry completely before applying NitroFix.$t$
where slug = 'becof-nitrofix';

update public.product_variants v set size_liters = 100, price = 1950
from public.products p where v.product_id = p.id and p.slug = 'becof-nitrofix' and v.size_liters = 1;

-- TrichoShield: wettable powder, 1 kg KES 3,200
update public.products set
  unit = 'kg',
  price = 3200,
  images = array['/images/products/becof-trichoshield.jpg'],
  short_description = $t$Trichoderma harzianum wettable powder that protects roots from soil-borne fungal disease while boosting root growth — a biofungicide and biofertilizer in one.$t$,
  long_description = $t$Biological defence against soil-borne fungal diseases — and a root biofertilizer.

Becof TrichoShield™ is a biological product formulated as a wettable powder (WP) containing the beneficial fungus Trichoderma harzianum at 2 × 10¹⁰ CFU/g. It controls soil pathogenic fungi while acting as a biofertilizer that enhances root development and crop vigour.

Because it is a live, naturally occurring soil organism, TrichoShield is well suited to integrated crop management, has a zero pre-harvest interval, and is practically non-toxic to bees, birds and other beneficial organisms.

Active ingredient: Trichoderma harzianum — 2 × 10¹⁰ CFU/g.

Mode of action
Trichoderma harzianum occurs naturally in soils and root ecosystems. Applied to seed, transplants, soil or growing media, it colonises the developing root zone and protects it against soil-borne pathogenic fungi by competing for space and nutrients, by mycoparasitism (attacking and feeding on harmful fungi), and by establishing a protective root environment. As it grows, its hyphae improve soil structure, release locked-up nutrients from organic matter and help retain soil moisture — giving a growth-promoting effect alongside disease suppression.

Key features
- Dual action: a biofungicide and biofertilizer in one — suppresses root pathogens while boosting plant growth.
- Zero pre-harvest interval: can be used at any crop stage, with no waiting period before harvest.
- Living root protection: colonises the root zone to crowd out and parasitise harmful fungi.
- Soil and IPM friendly: practically non-toxic to bees, birds and beneficial organisms; supports long-term soil health.

Soil- and root-applied (drip, drench, dip or broadcast) — not a foliar product.$t$,
  usage_instructions = $t$Drench (vegetables)
1 kg per hectare (about 400 g per acre) in enough water for the area. Pour into a watering can or sprayer, treat evenly, and irrigate after application.

Dip (cuttings and transplants)
Mix 200 g in 20 litres of water. Place rooted transplants or cuttings in a perforated crate and dip to soak the roots. Plant immediately after dipping. Apply once, at transplanting.

Drip (ornamentals)
1 kg per hectare (about 400 g per acre) through the fertigation drip system, using adequate water and agitating for the whole application. Apply weekly, 3 to 4 times. The soil should be moist but not wet.

Broadcast (turf)
Pre-irrigate the turf, then broadcast 200 g as a coarse spray in 5 to 10 litres of water per 1,000 square feet (about 93 m²) and irrigate immediately with overhead sprinklers. Repeat every 3 months.

Pre-harvest interval: 0 days. Re-entry interval: 4 hours.

Application guide
- Apply only to soil or growing media that is moist but not wet — not to very dry, compacted or waterlogged soil.
- Keep the suspension agitated, and irrigate lightly after application (except for root dips).
- Do not over-irrigate or let the soil stay saturated for more than about 3 hours after application.
- Where possible, let treated soil or media incubate for 1 day before planting.
- Do not apply chemical fungicides, harsh chemicals or fumigants at the same time — they kill the live organism.
- Compatible with fertilizers, organic fertilizers and biostimulants.$t$
where slug = 'becof-trichoshield';

update public.product_variants v set price = 3200
from public.products p where v.product_id = p.id and p.slug = 'becof-trichoshield' and v.size_liters = 1;

-- SoilFix: 1 L, KES 2,200
update public.products set
  unit = 'L',
  price = 2200,
  images = array['/images/products/becof-soilfix.jpg'],
  short_description = $t$Biofertilizer that revitalizes degraded soils, unlocks nutrients and stabilizes soil pH and EC for healthier, more productive crops.$t$,
  long_description = $t$Becof SoilFix™ is a biofertilizer beneficial in revitalizing degraded soils. Most soils experience nutrient lock-up; SoilFix helps improve the soil and stabilize pH and EC, strengthening plants' natural resistance to soil-borne disease.

SoilFix is an algae-based product tailored for agriculture. It offers a natural, nutrient-rich solution that enhances soil fertility and boosts crop yields, and is designed to integrate seamlessly into sustainable farming practices while reducing environmental impact.

Key features
- Enriches soil with essential nutrients.
- Promotes healthier and more productive crops.
- Eco-friendly and sustainable production process.$t$,
  usage_instructions = $t$Apply through foliar spray or drenching.

Drenching: 1 litre of SoilFix in 1,000 litres of water.
Foliar spray: 10 ml of SoilFix in 20 litres of water.$t$
where slug = 'becof-soilfix';

update public.product_variants v set price = 2200
from public.products p where v.product_id = p.id and p.slug = 'becof-soilfix' and v.size_liters = 1;
