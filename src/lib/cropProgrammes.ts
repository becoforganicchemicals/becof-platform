// Crop application programmes, approved by Becof's technical team (October
// 2026). Shown on the crop pages, used by the "How much do I need?"
// calculator, and published in llms.txt. Every application is the label dose:
// 2 L per acre mixed with 30 L of water (see LITRES_PER_ACRE in packs.ts).

export interface ProgrammeStep {
  productSlug: string;
  purpose: string;
  timing: string;
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

export const CROP_PROGRAMMES: CropProgramme[] = [
  {
    slug: "maize",
    name: "Maize",
    title: "Organic Biofertilizers for Maize",
    description:
      "Becof's biofertilizer programme for maize in Kenya: which products to use, when to apply them, and how many litres you need per acre.",
    intro:
      "A complete biological programme for maize: natural nitrogen for strong vegetative growth, stronger roots for better nutrient uptake, protection against soil-borne disease, and healthier soil season after season.",
    steps: [
      {
        productSlug: "becof-nitrofix",
        purpose: "Natural nitrogen for strong vegetative growth and greener leaves",
        timing: "At planting, and again at 4–6 weeks (knee-high, around top-dressing time)",
        applications: 2,
      },
      {
        productSlug: "becof-rootmax",
        purpose: "Stronger roots and better nutrient uptake",
        timing: "At planting, and again at 3–4 weeks",
        applications: 2,
      },
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects roots from soil-borne disease",
        timing: "At planting; repeat at 4 weeks where soil-borne disease pressure is high",
        applications: 1,
        note: "Use 2 applications where soil-borne disease is a known problem.",
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Rebuilds soil health and stabilises pH",
        timing: "At land preparation or planting, and again mid-season",
        applications: 2,
      },
    ],
  },
  {
    slug: "beans",
    name: "Beans",
    title: "Organic Biofertilizers for Beans",
    description:
      "Becof's biofertilizer programme for dry beans and French beans in Kenya: natural nitrogen-fixing nodules, stronger roots and protection from root rot, with litres needed per acre.",
    intro:
      "Beans are a short crop, so this programme does most of its work at planting and in the first weeks. NitroFix™ contains Rhizobium, which works with bean roots to form nodules that fix nitrogen directly for the plant — the earlier it reaches young roots, the better.",
    crops: "Dry beans (rosecoco, mwitemania, yellow beans and others) and French beans",
    steps: [
      {
        productSlug: "becof-nitrofix",
        purpose: "Rhizobium forms nitrogen-fixing nodules on bean roots, plus natural nitrogen for strong growth",
        timing: "At planting, close to the seed so the bacteria reach young roots early, and again at 3 weeks",
        applications: 2,
      },
      {
        productSlug: "becof-rootmax",
        purpose: "Stronger roots and better nutrient uptake",
        timing: "At planting, and again at 3 weeks",
        applications: 2,
      },
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects roots from soil-borne disease such as root rot",
        timing: "At planting; repeat at 3–4 weeks where root rot is a known problem",
        applications: 1,
        note: "Use 2 applications where root rot is a known problem.",
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Rebuilds soil health and stabilises pH",
        timing: "At land preparation or planting, and again before flowering",
        applications: 2,
      },
    ],
  },
  {
    slug: "potatoes",
    name: "Potatoes",
    title: "Organic Biofertilizers for Potatoes",
    description:
      "Becof's biofertilizer programme for potatoes in Kenya: protect tubers and roots from soil-borne disease, build stronger roots and healthier soil, with litres needed per acre.",
    intro:
      "Potatoes are especially exposed to soil-borne disease. This programme protects the root zone from planting through hilling, builds a stronger root system, and improves the soil the crop grows in.",
    steps: [
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects roots and tubers from soil-borne disease",
        timing: "At planting (in the furrow, over the seed tubers), and again at hilling (4–5 weeks)",
        applications: 2,
      },
      {
        productSlug: "becof-rootmax",
        purpose: "Stronger roots and better nutrient uptake",
        timing: "At planting, and again at hilling",
        applications: 2,
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Rebuilds soil health and stabilises pH",
        timing: "At planting, and again at about 6 weeks",
        applications: 2,
      },
    ],
  },
  {
    slug: "vegetables",
    name: "Vegetables",
    title: "Organic Biofertilizers for Vegetables",
    description:
      "Becof's biofertilizer programme for onions, tomatoes, cabbage, kale and other vegetables in Kenya, with application timing and litres needed per acre.",
    intro:
      "For onions, tomatoes, cabbages, kales (sukuma wiki), spinach, peppers and other vegetables. Start in the nursery or at transplanting to protect young roots, then keep feeding the soil and plant through the season.",
    crops: "Onions, tomatoes, cabbage, kale (sukuma wiki), spinach, capsicum, carrots and other vegetables",
    steps: [
      {
        productSlug: "becof-trichoshield",
        purpose: "Protects young roots from soil-borne disease",
        timing: "As a nursery or transplanting drench, and again 3–4 weeks later",
        applications: 2,
      },
      {
        productSlug: "becof-rootmax",
        purpose: "Faster establishment and stronger roots after transplanting",
        timing: "At transplanting, and again 3 weeks later",
        applications: 2,
      },
      {
        productSlug: "becof-nitrofix",
        purpose: "Natural nitrogen for vigorous leaf growth",
        timing: "At transplanting, and again at 4 weeks (especially for leafy vegetables)",
        applications: 2,
      },
      {
        productSlug: "becof-soilfix",
        purpose: "Rebuilds soil health and stabilises pH",
        timing: "At transplanting, then every 4–6 weeks for long-season crops such as tomatoes",
        applications: 2,
        note: "Use 3 applications for long-season crops such as tomatoes.",
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

// General handling advice, shown on crop pages and in the FAQ.
export const HANDLING_NOTES = [
  "Mix each 2 L dose with 30 L of clean, non-chlorinated water and apply the same day.",
  "Apply to moist soil, ideally in the early morning or late afternoon, out of strong sun.",
  "Store products in a cool, shaded place — they contain live beneficial microorganisms.",
  "Leave at least 7 days between TrichoShield™ and any copper-based or chemical fungicide.",
];
