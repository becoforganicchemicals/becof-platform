import { describe, expect, it } from "vitest";
import { amountForArea, bestPackPlan, formatAmount, formatSize, maxPacks, packSummary, pricePerUnit, type PackSize } from "./packs";

// NitroFix price list (October 2026)
const nitrofix: PackSize[] = [
  { id: "1", size_liters: 1, price: 2950, sku: "N" },
  { id: "5", size_liters: 5, price: 14000, sku: "N-5L" },
  { id: "10", size_liters: 10, price: 28000, sku: "N-10L" },
  { id: "20", size_liters: 20, price: 56000, sku: "N-20L" },
  { id: "50", size_liters: 50, price: 140000, sku: "N-50L" },
];

const describePlan = (litres: number) =>
  bestPackPlan(nitrofix, litres)!.lines.map((l) => `${l.quantity}x${l.pack.size_liters}`).join(" + ");

describe("bestPackPlan", () => {
  it("uses single bottles for small amounts", () => {
    expect(describePlan(2)).toBe("2x1");
    expect(describePlan(4)).toBe("4x1");
  });

  it("switches to a 5 L pack once it is cheaper than 1 L bottles", () => {
    // 5 x 1 L = 14,750 vs 5 L = 14,000
    expect(describePlan(5)).toBe("1x5");
    // ...but not before: 4 x 1 L (11,800) is cheaper than a 5 L pack
    expect(bestPackPlan(nitrofix, 4)!.price).toBe(11800);
  });

  it("prefers fewer, larger containers when the price is the same", () => {
    expect(describePlan(20)).toBe("1x20");
    expect(describePlan(50)).toBe("1x50");
    expect(describePlan(100)).toBe("2x50");
    expect(describePlan(30)).toBe("1x20 + 1x10");
  });

  it("covers awkward amounts at the lowest cost", () => {
    const plan = bestPackPlan(nitrofix, 23)!;
    expect(plan.amount).toBeGreaterThanOrEqual(23);
    // 20 L + 3 x 1 L = 64,850 vs 25 L (20 + 5) = 70,000
    expect(plan.price).toBe(64850);
    expect(describePlan(23)).toBe("1x20 + 3x1");
  });

  it("never pays for a bigger pack when smaller ones cost less", () => {
    // 9 L: 5 L + 4 x 1 L (25,800) is cheaper than a 10 L pack (28,000)
    expect(bestPackPlan(nitrofix, 9)!.price).toBe(25800);
    // 10 L exactly: one 10 L pack (28,000) vs 2 x 5 L (28,000) → fewer packs
    expect(describePlan(10)).toBe("1x10");
  });

  it("ignores inactive packs and handles nothing needed", () => {
    const withInactive = nitrofix.map((p) => (p.size_liters === 50 ? { ...p, is_active: false } : p));
    expect(bestPackPlan(withInactive, 50)!.lines.map((l) => l.pack.size_liters)).not.toContain(50);
    expect(bestPackPlan(nitrofix, 0)).toBeNull();
    expect(bestPackPlan([], 10)).toBeNull();
  });
});

describe("helpers", () => {
  it("calculates amounts from acres, rate per acre and applications", () => {
    expect(amountForArea(5, 2, 2)).toBe(20);
    expect(amountForArea(2.5, 0.4, 2)).toBe(2);
    expect(amountForArea(-1, 2, 2)).toBe(0);
  });

  it("limits packs to the litres left in stock", () => {
    expect(maxPacks(nitrofix[3], 100)).toBe(5);
    expect(maxPacks(nitrofix[3], 100, 70)).toBe(1);
    expect(maxPacks(nitrofix[4], 30)).toBe(0);
  });

  it("works out the price per unit", () => {
    expect(pricePerUnit(nitrofix[4])).toBe(2800);
    expect(pricePerUnit(nitrofix[0])).toBe(2950);
  });
});

// October 2026 range: products sold in kg and g packs
const rootmax: PackSize[] = [
  { id: "1", size_liters: 1, price: 2100, sku: "R" },
  { id: "5", size_liters: 5, price: 10000, sku: "R-5KG" },
];
const nitrofix100g: PackSize[] = [{ id: "100", size_liters: 100, price: 1950, sku: "N" }];
const tricho: PackSize[] = [{ id: "1", size_liters: 1, price: 3200, sku: "T" }];

describe("kg and g packs", () => {
  const plan = (packs: PackSize[], amount: number) =>
    bestPackPlan(packs, amount)!.lines.map((l) => `${l.quantity}x${l.pack.size_liters}`).join(" + ");

  it("RootMax: 5 kg pack when it is cheaper than five 1 kg packs", () => {
    // 5 x 1 kg = 10,500 vs 5 kg = 10,000
    expect(plan(rootmax, 5)).toBe("1x5");
    // 3 acres of maize at 2 kg = 6 kg → 5 kg + 1 kg
    expect(plan(rootmax, amountForArea(3, 2, 1))).toBe("1x5 + 1x1");
    expect(bestPackPlan(rootmax, 6)!.price).toBe(12100);
  });

  it("NitroFix: one 100 g pack per acre, rounding up part acres", () => {
    expect(plan(nitrofix100g, amountForArea(1, 100, 1))).toBe("1x100");
    expect(plan(nitrofix100g, amountForArea(2.5, 100, 1))).toBe("3x100");
    expect(bestPackPlan(nitrofix100g, 250)!.price).toBe(5850);
  });

  it("TrichoShield: whole 1 kg packs for a fractional need", () => {
    // 3 acres x 0.4 kg x 2 applications = 2.4 kg → 3 packs
    expect(plan(tricho, amountForArea(3, 0.4, 2))).toBe("3x1");
    // floating point: 0.4 x 5 = 2.0000000000000004 must not round up to 3
    expect(plan(tricho, amountForArea(5, 0.4, 1))).toBe("2x1");
  });

  it("formats sizes and amounts in the right unit", () => {
    expect(formatSize(100, "g")).toBe("100 g");
    expect(formatSize(5, "kg")).toBe("5 kg");
    expect(formatAmount(1.2, "L")).toBe("1.2 L");
    expect(formatAmount(1500, "g")).toBe("1.5 kg");
    expect(packSummary(rootmax, "kg")).toBe("1 kg · also 5 kg");
    expect(packSummary(nitrofix100g, "g")).toBe("100 g");
  });
});
