// Short factual badges under each product's name, taken from its label and
// Becof's approved claims. (They replace the old "Eco Score", which was a
// database default with no method behind it.)

export const PRODUCT_BADGES: Record<string, string[]> = {
  "becof-nitrofix": ["Contains no chemicals", "Natural, biological ingredients", "Gum arabic adhesive included"],
  "becof-rootmax": ["Natural, biological ingredients", "Applied once at planting", "Improves drought resistance"],
  "becof-trichoshield": ["Zero pre-harvest interval", "Safe for bees & birds", "Natural, biological ingredients"],
  "becof-soilfix": ["Natural, biological ingredients", "Stabilizes soil pH & EC"],
  "becof-neemshield": ["Botanical — neem-based", "Insecticide · Miticide · Nematicide"],
};
