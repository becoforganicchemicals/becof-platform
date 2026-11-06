# AGENTS.md — project decisions

## Order emails: admin at creation, customer after payment

When a standard order is created, only the admin alert (`send-order-email`
type `order_placed`) goes out, marked "(unpaid)". The customer is never
emailed at order creation — their first and only pre-delivery email is
"Payment Confirmed" (`type payment_received`), sent by `mpesa-callback`,
the mock path in `mpesa-stk-push`, and `mpesa-stk-query` when the order
actually transitions to paid. Why: emailing the customer before they've
entered their M-Pesa PIN read as a confirmation for an unpaid order.

## Monthly paid-and-delivered order metric

The monthly completed-order count uses `orders.delivered_at`, recorded when an order enters the delivered state, and the Africa/Nairobi calendar month. Why: status alone does not show when delivery happened.
