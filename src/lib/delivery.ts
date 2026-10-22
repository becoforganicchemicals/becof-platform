// Delivery pricing, anywhere in Kenya. Must match the shipping settings in
// Google Merchant Center (flat KES 500, free over KES 30,000) — Google checks
// that listings and checkout agree. Also stated in Terms of Service §5 and
// llms.txt (scripts/prerender.mjs); update those too if these change.

export const DELIVERY_FEE = 500;
export const FREE_DELIVERY_THRESHOLD = 30000;

// Based on the product subtotal, before coupons and points, so a discount
// never takes away free delivery the order otherwise qualified for.
export const deliveryFeeFor = (subtotal: number) =>
  subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

export const formatKes = (amount: number) => `KES ${amount.toLocaleString("en-KE")}`;

export const DELIVERY_SUMMARY = `${formatKes(DELIVERY_FEE)} delivery anywhere in Kenya · Free on orders over ${formatKes(FREE_DELIVERY_THRESHOLD)}`;
