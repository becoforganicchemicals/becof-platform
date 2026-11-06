import { describe, expect, it } from "vitest";
import { countPaidDeliveredOrdersThisMonth, getNairobiMonthBounds } from "./orderMetrics";

describe("paid and delivered order metric", () => {
  it("uses the Africa/Nairobi calendar month boundaries", () => {
    expect(getNairobiMonthBounds(new Date("2026-11-05T12:00:00.000Z"))).toEqual({
      start: "2026-10-31T21:00:00.000Z",
      end: "2026-11-30T21:00:00.000Z",
    });
  });

  it("counts only orders paid and delivered within the current Nairobi month", () => {
    const orders = [
      { status: "delivered", payment_status: "paid", delivered_at: "2026-10-31T21:00:00.000Z" },
      { status: "delivered", payment_status: "pending", delivered_at: "2026-11-05T09:00:00.000Z" },
      { status: "processing", payment_status: "paid", delivered_at: "2026-11-05T09:00:00.000Z" },
      { status: "delivered", payment_status: "paid", delivered_at: "2026-11-30T21:00:00.000Z" },
    ];

    expect(countPaidDeliveredOrdersThisMonth(orders, new Date("2026-11-05T12:00:00.000Z"))).toBe(1);
  });
});