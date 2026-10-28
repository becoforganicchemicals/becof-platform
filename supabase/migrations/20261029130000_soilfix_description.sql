-- SoilFix description matches its label: a liquid biofertilizer with
-- Bacillus spp. and Azotobacter vinelandii (replaces the algae-based wording).

update public.products set
  long_description = $t$Becof SoilFix™ is a liquid biofertilizer beneficial in revitalizing degraded soils. It contains beneficial soil bacteria — Bacillus spp. and Azotobacter vinelandii — that help rebuild soil health and improve nutrient availability for the plant.

Most soils experience nutrient lock-up. SoilFix helps improve the soil and stabilize pH and EC, strengthening plants' natural resistance to soil-borne disease.

Key features
- Rebuilds soil health and improves nutrient availability.
- Stabilizes soil pH and EC for a better growing environment.
- Promotes healthier and more productive crops.
- Natural and eco-friendly.$t$
where slug = 'becof-soilfix';
