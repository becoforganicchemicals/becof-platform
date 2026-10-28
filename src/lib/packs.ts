// Pack sizes and how much product a farm needs. Each product is sold in its
// own unit (products.unit: L, kg or g). Pack sizes (product_variants.size_liters
// — the column name predates kg/g) and stock (products.stock_quantity) are
// amounts in that unit.

export type Unit = "L" | "kg" | "g";

export interface PackSize {
  id: string;
  size_liters: number; // pack size in the product's unit
  price: number;
  sku: string | null;
  is_active?: boolean;
}

export const unitOf = (unit: string | null | undefined): Unit => (unit === "kg" || unit === "g" ? unit : "L");

const number = (n: number) => Number(n).toLocaleString("en-KE", { maximumFractionDigits: 1 });

// "1 L", "5 kg", "100 g"
export const formatSize = (size: number, unit: Unit) => `${number(size)} ${unit}`;

// Amounts that can be large or fractional: "1.2 L", "400 g", "1.5 kg"
export const formatAmount = (amount: number, unit: Unit) =>
  unit === "g" && amount >= 1000 ? `${number(amount / 1000)} kg` : formatSize(amount, unit);

// Price per kg / per L, shown when a product comes in more than one size
export const pricePerUnit = (pack: PackSize) => Math.round(pack.price / pack.size_liters);

export const sortPacks = <T extends PackSize>(packs: T[] | null | undefined): T[] =>
  [...(packs || [])].filter((p) => p.is_active !== false).sort((a, b) => a.size_liters - b.size_liters);

// The smallest pack — what "Add to cart" on a product card adds.
export const defaultPack = <T extends PackSize>(packs: T[] | null | undefined): T | undefined =>
  sortPacks(packs)[0];

export const isPackInStock = (pack: PackSize, stock: number) => stock >= pack.size_liters;

// Packs of this size that can still be added, given the amount already in the
// cart for the same product (all pack sizes draw on the same stock).
export const maxPacks = (pack: PackSize, stock: number, amountInCart = 0) =>
  Math.max(0, Math.floor((stock - amountInCart) / pack.size_liters));

export interface PackLine<T extends PackSize = PackSize> {
  pack: T;
  quantity: number;
}

export interface PackPlan<T extends PackSize = PackSize> {
  lines: PackLine<T>[];
  amount: number; // total amount in the plan (may exceed what's needed)
  price: number;
}

// Cheapest combination of packs covering at least `needed` (in the product's
// unit). Ties go to fewer packs, then to less leftover product.
export const bestPackPlan = <T extends PackSize>(packsIn: T[], needed: number): PackPlan<T> | null => {
  const packs = sortPacks(packsIn).filter((p) => p.size_liters > 0 && Number.isInteger(p.size_liters));
  const target = Math.ceil(needed - 1e-9);
  if (!packs.length || target <= 0) return null;

  const largest = packs[packs.length - 1].size_liters;
  const limit = target + largest;
  // best[x] = cheapest way to buy exactly x units
  const best: ({ price: number; count: number; from: number; pack: number } | null)[] = Array(limit + 1).fill(null);
  best[0] = { price: 0, count: 0, from: -1, pack: -1 };
  for (let x = 1; x <= limit; x++) {
    packs.forEach((p, i) => {
      const prev = x - p.size_liters;
      if (prev < 0 || !best[prev]) return;
      const cand = { price: best[prev]!.price + p.price, count: best[prev]!.count + 1, from: prev, pack: i };
      const cur = best[x];
      if (!cur || cand.price < cur.price || (cand.price === cur.price && cand.count < cur.count)) best[x] = cand;
    });
  }

  let pick = -1;
  for (let x = target; x <= limit; x++) {
    const b = best[x];
    if (!b) continue;
    const cur = pick >= 0 ? best[pick]! : null;
    if (!cur || b.price < cur.price || (b.price === cur.price && b.count < cur.count)) pick = x;
  }
  if (pick < 0) return null;

  const counts = new Map<number, number>();
  for (let x = pick; x > 0; x = best[x]!.from) counts.set(best[x]!.pack, (counts.get(best[x]!.pack) || 0) + 1);
  const lines = [...counts.entries()]
    .map(([i, quantity]) => ({ pack: packs[i], quantity }))
    .sort((a, b) => b.pack.size_liters - a.pack.size_liters);
  return { lines, amount: pick, price: best[pick]!.price };
};

// Under a product card's price: "1 kg · also 5 kg", or "100 g"
export const packSummary = (packs: PackSize[] | null | undefined, unit: Unit) => {
  const sorted = sortPacks(packs);
  if (!sorted.length) return formatSize(1, unit);
  const [first, ...rest] = sorted;
  return rest.length
    ? `${formatSize(first.size_liters, unit)} · also ${rest.map((p) => formatSize(p.size_liters, unit)).join(", ")}`
    : formatSize(first.size_liters, unit);
};

// Amount for a season: farm size × rate per acre × number of applications
export const amountForArea = (acres: number, ratePerAcre: number, applications: number) =>
  Math.max(0, acres) * ratePerAcre * Math.max(0, applications);
