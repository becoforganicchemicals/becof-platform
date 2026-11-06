export interface OrderDeliveryMetricRow {
  status: string;
  payment_status: string | null;
  delivered_at: string | null;
}

export const getNairobiMonthBounds = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  // Nairobi remains UTC+3; convert local midnight to the equivalent UTC instant.
  const start = Date.UTC(year, month - 1, 1) - 3 * 60 * 60 * 1000;
  const end = Date.UTC(year, month, 1) - 3 * 60 * 60 * 1000;

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
};

export const countPaidDeliveredOrdersThisMonth = (
  orders: OrderDeliveryMetricRow[],
  now = new Date(),
) => {
  const { start, end } = getNairobiMonthBounds(now);
  return orders.filter((order) =>
    order.status === "delivered" &&
    order.payment_status === "paid" &&
    order.delivered_at !== null &&
    order.delivered_at >= start &&
    order.delivered_at < end,
  ).length;
};