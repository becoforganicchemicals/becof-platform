import { describe, expect, it } from "vitest";
import { bestPackPlan, litresForArea, maxPacks, pricePerLitre, type PackSize } from "./packs";

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
    expect(plan.litres).toBeGreaterThanOrEqual(23);
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
  it("calculates litres from acres and applications at 2 L per acre", () => {
    expect(litresForArea(5, 2)).toBe(20);
    expect(litresForArea(2.5, 1)).toBe(5);
    expect(litresForArea(-1, 2)).toBe(0);
  });

  it("limits packs to the litres left in stock", () => {
    expect(maxPacks(nitrofix[3], 100)).toBe(5);
    expect(maxPacks(nitrofix[3], 100, 70)).toBe(1);
    expect(maxPacks(nitrofix[4], 30)).toBe(0);
  });

  it("works out the price per litre", () => {
    expect(pricePerLitre(nitrofix[4])).toBe(2800);
    expect(pricePerLitre(nitrofix[0])).toBe(2950);
  });
});
