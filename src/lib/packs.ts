// Pack sizes and how much product a farm needs. Every product is sold in
// litre packs (product_variants); stock is one number per product, in litres.

export interface PackSize {
  id: string;
  size_liters: number;
  price: number;
  sku: string | null;
  is_active?: boolean;
}

// Label dose for every Becof product: 2 L per acre per application, mixed
// with 30 L of water.
export const LITRES_PER_ACRE = 2;
export const WATER_LITRES_PER_ACRE = 30;

export const formatLitres = (litres: number) => `${Number(litres).toLocaleString("en-KE")} L`;

export const pricePerLitre = (pack: PackSize) => Math.round(pack.price / pack.size_liters);

export const sortPacks = <T extends PackSize>(packs: T[] | null | undefined): T[] =>
  [...(packs || [])].filter((p) => p.is_active !== false).sort((a, b) => a.size_liters - b.size_liters);

// The 1 L pack (or smallest available) — what "Add to cart" on a product card adds.
export const defaultPack = <T extends PackSize>(packs: T[] | null | undefined): T | undefined =>
  sortPacks(packs)[0];

export const isPackInStock = (pack: PackSize, stockLitres: number) => stockLitres >= pack.size_liters;

// Packs of this size that can still be added, given litres already in the cart
// for the same product (all sizes draw on the same stock).
export const maxPacks = (pack: PackSize, stockLitres: number, litresInCart = 0) =>
  Math.max(0, Math.floor((stockLitres - litresInCart) / pack.size_liters));

export interface PackLine<T extends PackSize = PackSize> {
  pack: T;
  quantity: number;
}

export interface PackPlan<T extends PackSize = PackSize> {
  lines: PackLine<T>[];
  litres: number; // total litres in the plan (may exceed what's needed)
  price: number;
}

// Cheapest combination of packs covering at least `litresNeeded`. Ties go to
// fewer packs (fewer containers to carry), then to less leftover product.
export const bestPackPlan = <T extends PackSize>(packsIn: T[], litresNeeded: number): PackPlan<T> | null => {
  const packs = sortPacks(packsIn).filter((p) => p.size_liters > 0 && Number.isInteger(p.size_liters));
  const needed = Math.ceil(litresNeeded);
  if (!packs.length || needed <= 0) return null;

  const largest = packs[packs.length - 1].size_liters;
  const limit = needed + largest;
  // best[x] = cheapest way to buy exactly x litres
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
  for (let x = needed; x <= limit; x++) {
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
  return { lines, litres: pick, price: best[pick]!.price };
};

// Under a product card's 1 L price: "per 1 L · packs up to 50 L"
export const packSummary = (packs: PackSize[] | null | undefined) => {
  const sorted = sortPacks(packs);
  if (sorted.length <= 1) return `per ${formatLitres(sorted[0]?.size_liters ?? 1)}`;
  return `per ${formatLitres(sorted[0].size_liters)} · packs up to ${formatLitres(sorted[sorted.length - 1].size_liters)}`;
};

export const litresForArea = (acres: number, applications: number) =>
  Math.max(0, acres) * LITRES_PER_ACRE * Math.max(0, applications);
