// supabase/functions/mpesa-callback/index.ts
// Receives the Daraja STK Push result callback (DARAJA_CALLBACK_URL) and finalises the order.
// Only relevant once MOCK_MODE is turned off in mpesa-stk-push — set this function's
// verify_jwt to false in config.toml since Safaricom never sends a Supabase auth header.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Safaricom cancellation code — everything else is treated as a generic failure.
const USER_CANCELLED_CODE = 1032;

serve(async (req) => {
    // Always acknowledge with 200 + ResultCode 0 so Safaricom doesn't retry the callback,
    // even when we fail to process it internally.
    const ack = () => new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
    });

    try {
        const payload = await req.json();
        const stkCallback = payload?.Body?.stkCallback;

        if (!stkCallback?.CheckoutRequestID) {
            console.error("mpesa-callback: missing CheckoutRequestID", JSON.stringify(payload));
            return ack();
        }

        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // We don't know order_type from the callback itself, so look it up by
        // the CheckoutRequestID we stored when the STK push was sent.
        // payment_status/coupon_id/points_redeemed are fetched so we can (a)
        // tell whether this order was already marked paid before (idempotency
        // — Safaricom can retry a callback) and (b) apply the coupon/points
        // side effects exactly once, at the moment payment actually lands.
        const { data: standardOrder } = await supabase
            .from("orders")
            .select("id, user_id, payment_status, coupon_id, points_redeemed")
            .eq("mpesa_checkout_request_id", CheckoutRequestID)
            .maybeSingle();

        let table: "orders" | "custom_orders" | null = null;
        let order: { id: string; user_id: string | null; payment_status?: string | null; coupon_id?: string | null; points_redeemed?: number | null } | null = null;

        if (standardOrder) {
            table = "orders";
            order = standardOrder;
        } else {
            const { data: customOrder } = await supabase
                .from("custom_orders")
                .select("id, user_id")
                .eq("mpesa_checkout_request_id", CheckoutRequestID)
                .maybeSingle();
            if (customOrder) {
                table = "custom_orders";
                order = customOrder;
            }
        }

        if (!table || !order) {
            console.error("mpesa-callback: no order found for CheckoutRequestID", CheckoutRequestID);
            return ack();
        }

        const isCustom = table === "custom_orders";
        const orderType = isCustom ? "custom" : "standard";

        if (ResultCode === 0) {
            const items: Array<{ Name: string; Value: string | number }> = CallbackMetadata?.Item ?? [];
            const getItem = (name: string) => items.find(i => i.Name === name)?.Value;
            const amount = getItem("Amount");
            const receipt = getItem("MpesaReceiptNumber") as string | undefined;

            // Atomic "claim", run BEFORE anything else touches this row: only
            // actually updates (and returns) a row if this call is the one
            // transitioning the order into paid. Deliberately separate from
            // the always-runs update below — that one must stay unconditional
            // so a callback arriving after mpesa-stk-query already marked the
            // order paid still backfills mpesa_receipt_number (query
            // responses don't carry a receipt; only this callback's
            // CallbackMetadata does).
            const { data: claimedRows } = await supabase.from(table)
                .update({ payment_status: "paid" })
                .eq("id", order.id)
                .neq("payment_status", "paid")
                .select("id");
            const wonTheRace = (claimedRows?.length ?? 0) > 0;

            await supabase.from(table).update({
                payment_status: "paid",
                mpesa_receipt_number: receipt ?? null,
                status: isCustom ? "deposit_paid" : "confirmed",
                ...(isCustom ? { deposit_paid: true, deposit_receipt: receipt ?? null } : {}),
            }).eq("id", order.id);

            // Coupon usage + points redemption are applied exactly once, only
            // for standard orders, only on the actual transition into "paid"
            // — never on a retried/duplicate callback for an order already
            // marked paid. This is deliberately AFTER payment succeeds, not
            // at order creation, so an abandoned/failed payment never costs
            // the customer a coupon use or their points.
            if (!isCustom && wonTheRace) {
                if (order.coupon_id) {
                    const { data: coupon } = await supabase.from("coupons").select("current_uses").eq("id", order.coupon_id).maybeSingle();
                    if (coupon) {
                        await supabase.from("coupons").update({ current_uses: coupon.current_uses + 1 }).eq("id", order.coupon_id);
                    }
                }
                if (order.points_redeemed && order.points_redeemed > 0) {
                    const { data: existingRedemption } = await supabase
                        .from("loyalty_points")
                        .select("id")
                        .eq("order_id", order.id)
                        .eq("type", "redemption")
                        .maybeSingle();
                    if (!existingRedemption && order.user_id) {
                        const { data: ledger } = await supabase.from("loyalty_points").select("points, expires_at").eq("user_id", order.user_id);
                        const now = new Date();
                        const balance = (ledger || []).reduce((sum, row) => {
                            const valid = !row.expires_at || new Date(row.expires_at) > now;
                            return valid ? sum + row.points : sum;
                        }, 0);
                        // Best-effort: if the customer's balance can no longer cover
                        // this (e.g. spent on a different order that paid first), skip
                        // the deduction rather than block a payment that already
                        // succeeded — this is intentionally not a hard failure.
                        if (balance >= order.points_redeemed) {
                            await supabase.from("loyalty_points").insert({
                                user_id: order.user_id,
                                points: -order.points_redeemed,
                                type: "redemption",
                                order_id: order.id,
                                description: `Redeemed on order #${String(order.id).slice(0, 8).toUpperCase()}`,
                            });
                        } else {
                            console.error(`mpesa-callback: insufficient points balance to redeem on order ${order.id} (have ${balance}, need ${order.points_redeemed}) — skipping redemption`);
                        }
                    }
                }
            }

            if (order.user_id) {
                await supabase.from("order_notifications").insert({
                    user_id: order.user_id,
                    order_id: order.id,
                    order_type: orderType,
                    type: "payment_received",
                    message: `Payment of KES ${amount} received. Receipt: ${receipt}`,
                });
            }

            await supabase.functions.invoke("send-order-email", {
                body: { order_id: order.id, order_type: orderType, type: "payment_received", amount, receipt },
            });
        } else {
            await supabase.from(table).update({
                payment_status: ResultCode === USER_CANCELLED_CODE ? "cancelled" : "failed",
            }).eq("id", order.id);
        }

        return ack();
    } catch (err) {
        console.error("mpesa-callback error:", err);
        return ack();
    }
});
