// Crop application programmes. Shown on the crop pages, used by the "How much
// do I need?" calculators, and published in llms.txt.
//
// October 2026 range, approved by Becof's technical team. Rates come from
// each product's label. SoilFix's per-acre drench rate (1 L in 1,000 L of
// water per acre) and NeemShield's "repeat as needed" are Becof's guidance.

export interface ProgrammeStep {
  productSlug: string;
  purpose: string;
  timing: string;
  ratePerAcre: number; // in the product's unit (products.unit)
  rateText: string; // how farmers see the rate
  applications: number; // recommended per season
  note?: string;
}

export interface CropProgramme {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  crops?: string;
  steps: ProgrammeStep[];
}

// Default use of each product, for crops without a programme ("Other crop")
export const PRODUCT_USAGE: Record<string, { ratePerAcre: number; rateText: string; applications: number; how: string }> = {
  "becof-nitrofix": { ratePerAcre: 100, rateText: "100 g per acre of seed", applications: 1, how: "Coat the seed just before planting." },
  "becof-rootmax": { ratePerAcre: 5, rateText: "4–5 kg per acre (1–2 kg for cereals)", applications: 1, how: "Apply once, at planting." },
  "becof-trichoshield": { ratePerAcre: 0.4, rateText: "400 g per acre as a drench", applications: 2, how: "Drench at planting or transplanting, and again 3–4 weeks later." },
  "becof-soilfix": { ratePerAcre: 1, rateText: "1 L per acre as a drench (1 L in 1,000 L of water)", applications: 2, how: "Drench at planting, and again mid-season." },
  "becof-neemshield": { ratePerAcre: 1.2, rateText: "1.2 L per acre as a foliar spray", applications: 2, how: "Spray when pests appear, and repeat as needed." },
};

const ROOTMAX_CEREALS = { ratePerAcre: 2, rateText: "1–2 kg per acre" };
const ROOTMAX_OTHER = { ratePerAcre: 5, rateText: "4–5 kg per acre" };
const TRICHO_DRENCH = { ratePerAcre: 0.4, rateText: "400 g per acre as a drench" };
const SOILFIX_DRENCH = { ratePerAcre: 1, rateText: "1 L per acre (1 L in 1,000 L of water)" };
const NEEM_FOLIAR = { ratePerAcre: 1.2, rateText: "1.2 L per acre as a foliar spray" };

export const CROP_PROGRAMMES: CropProgramme[] = [
  {
    slug: "maize",
    name: "Maize",
    title: "Organic Inputs for Maize",
    description:
      "Becof's programme for maize in Kenya: stronger roots with mycorrhiza, healthier soil and botanical pest control — which products to use, when, and how much per acre.",
    intro:
      "A biological programme for maize: mycorrhiza granules at planting for a stronger root system and better drought resistance, healthier soil through the season, and botanical protection when pests appear.",
    steps: [
      {
        productSlug: "becof-rootmax",
        purpose: "Builds a stronger root system for better water and nutrient uptake and drought resistance",
        timing: "Once at planting — mix with your planting fertilizer",
        ...ROOTMAX_CEREALS,
        applications: 1,
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Revitalizes the soil, unlocks nutrients and stabilizes pH and EC",
        timing: "Drench at planting, and again at 4–6 weeks",
        ...SOILFIX_DRENCH,
        applications: 2,
      },
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects roots from soil-borne fungal disease",
        timing: "Drench at planting where soil-borne disease is a known problem",
        ...TRICHO_DRENCH,
        applications: 1,
        note: "Optional — use where soil-borne disease has affected previous crops.",
      },
      {
        productSlug: "becof-neemshield",
        purpose: "Botanical control of cutworm, aphids, leafhoppers and other pests",
        timing: "Spray when pests first appear, and repeat as needed",
        ...NEEM_FOLIAR,
        applications: 2,
      },
    ],
  },
  {
    slug: "beans",
    name: "Beans",
    title: "Organic Inputs for Beans",
    description:
      "Becof's programme for dry beans and French beans in Kenya: NitroFix rhizobium seed inoculation, mycorrhiza granules, root protection and botanical pest control, with amounts per acre.",
    intro:
      "Beans can make their own nitrogen from the air — with the right bacteria. This programme starts with NitroFix™ rhizobium on the seed, adds RootMax™ mycorrhiza for a stronger root system, protects the roots from disease, and controls pests naturally.",
    crops: "Dry beans (rosecoco, mwitemania, yellow beans, kidney beans and others) and French beans",
    steps: [
      {
        productSlug: "becof-nitrofix",
        purpose: "Rhizobium bacteria form nitrogen-fixing nodules, so beans make their own nitrogen",
        timing: "Coat the seed just before planting, and plant within 4 hours",
        ratePerAcre: 100,
        rateText: "100 g per acre of seed (15–25 kg of seed)",
        applications: 1,
        note: "NitroFix is for common dry beans and kidney beans. Don't top-dress with nitrogen after planting.",
      },
      {
        productSlug: "becof-rootmax",
        purpose: "Builds a stronger root system for better water and nutrient uptake",
        timing: "Once at planting — mix with your starter fertilizer, away from the coated seed",
        ...ROOTMAX_OTHER,
        applications: 1,
      },
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects roots from soil-borne disease such as root rot",
        timing: "Drench at planting; repeat at 3–4 weeks where root rot is a known problem",
        ...TRICHO_DRENCH,
        applications: 1,
        note: "Use 2 applications where root rot is a known problem.",
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Revitalizes the soil and stabilizes pH and EC",
        timing: "Drench at planting, and again before flowering",
        ...SOILFIX_DRENCH,
        applications: 2,
      },
      {
        productSlug: "becof-neemshield",
        purpose: "Botanical control of aphids, whitefly, thrips and other pests",
        timing: "Spray when pests first appear, and repeat as needed",
        ...NEEM_FOLIAR,
        applications: 2,
      },
    ],
  },
  {
    slug: "potatoes",
    name: "Potatoes",
    title: "Organic Inputs for Potatoes",
    description:
      "Becof's programme for potatoes in Kenya: root protection from soil-borne disease, mycorrhiza granules, healthier soil and botanical control of aphids and nematodes, with amounts per acre.",
    intro:
      "Potatoes are especially exposed to soil-borne disease and nematodes. This programme protects the root zone from planting through hilling, builds a stronger root system, and keeps pests in check naturally.",
    steps: [
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects roots and tubers from soil-borne fungal disease",
        timing: "Drench the furrow at planting, and again at hilling (4–5 weeks)",
        ...TRICHO_DRENCH,
        applications: 2,
      },
      {
        productSlug: "becof-rootmax",
        purpose: "Builds a stronger root system for better water and nutrient uptake",
        timing: "Once at planting — mix with your planting fertilizer",
        ...ROOTMAX_OTHER,
        applications: 1,
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Revitalizes the soil and stabilizes pH and EC",
        timing: "Drench at planting, and again at about 6 weeks",
        ...SOILFIX_DRENCH,
        applications: 2,
      },
      {
        productSlug: "becof-neemshield",
        purpose: "Botanical control of aphids, leaf miners and parasitic nematodes",
        timing: "Spray when pests appear; for nematodes, drench at 2–3.2 L per acre",
        ...NEEM_FOLIAR,
        applications: 2,
      },
    ],
  },
  {
    slug: "vegetables",
    name: "Vegetables",
    title: "Organic Inputs for Vegetables",
    description:
      "Becof's programme for tomatoes, onions, cabbage, kale and other vegetables in Kenya: root protection at transplanting, mycorrhiza, healthier soil and botanical pest control, with amounts per acre.",
    intro:
      "For tomatoes, onions, cabbages, kales (sukuma wiki), spinach, peppers and other vegetables. Protect young roots at transplanting, build a strong root system, keep the soil healthy, and control whitefly, aphids, thrips and mites naturally.",
    crops: "Tomatoes, onions, cabbage, kale (sukuma wiki), spinach, capsicum, chilli, carrots and other vegetables",
    steps: [
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects young roots from soil-borne fungal disease",
        timing: "Dip seedling roots at transplanting (200 g in 20 L of water), or drench; drench again 3–4 weeks later",
        ...TRICHO_DRENCH,
        applications: 2,
      },
      {
        productSlug: "becof-rootmax",
        purpose: "Faster establishment and a stronger root system",
        timing: "Once at transplanting — apply in the planting holes or with planting fertilizer",
        ...ROOTMAX_OTHER,
        applications: 1,
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Revitalizes the soil and stabilizes pH and EC",
        timing: "Drench at transplanting, then every 4–6 weeks for long-season crops such as tomatoes",
        ...SOILFIX_DRENCH,
        applications: 2,
        note: "Use 3 applications for long-season crops such as tomatoes.",
      },
      {
        productSlug: "becof-neemshield",
        purpose: "Botanical control of whitefly, aphids, thrips, spider mites and leaf miners",
        timing: "Spray when pests first appear, and repeat as needed",
        ...NEEM_FOLIAR,
        applications: 3,
      },
    ],
  },
];

// "maize, beans, potatoes and vegetables"
export const cropNamesList = () => {
  const names = CROP_PROGRAMMES.map((c) => c.name.toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
};

export const findProgramme = (slug: string | undefined) => CROP_PROGRAMMES.find((c) => c.slug === slug);

// Programmes a product appears in, for "Recommended for" on product pages.
export const programmesForProduct = (productSlug: string) =>
  CROP_PROGRAMMES.flatMap((crop) =>
    crop.steps.filter((s) => s.productSlug === productSlug).map((step) => ({ crop, step }))
  );

// General handling advice, shown on crop pages and in the FAQ (from labels).
export const HANDLING_NOTES = [
  "Use clean, non-chlorinated water — chlorine kills the live organisms in NitroFix™, TrichoShield™ and SoilFix™.",
  "NitroFix™: coat seed in a plastic (never metal) container, keep coated seed out of the sun, and plant within 4 hours.",
  "TrichoShield™: apply to moist (not waterlogged) soil, and never at the same time as chemical fungicides or fumigants.",
  "NeemShield™: add water to NeemShield, not NeemShield to water, and stir to a good emulsion.",
  "Store all products in a cool, dry, shaded place, away from direct sunlight.",
];
