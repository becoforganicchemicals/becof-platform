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
        const { data: standardOrder } = await supabase
            .from("orders")
            .select("id, user_id")
            .eq("mpesa_checkout_request_id", CheckoutRequestID)
            .maybeSingle();

        let table: "orders" | "custom_orders" | null = null;
        let order: { id: string; user_id: string | null } | null = null;

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

            await supabase.from(table).update({
                payment_status: "paid",
                mpesa_receipt_number: receipt ?? null,
                status: isCustom ? "deposit_paid" : "confirmed",
                ...(isCustom ? { deposit_paid: true, deposit_receipt: receipt ?? null } : {}),
            }).eq("id", order.id);

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
