// supabase/functions/mpesa-stk-query/index.ts
// Admin reconciliation tool: actively asks Daraja for the status of a previously
// initiated STK push, for orders where mpesa-callback never arrived (network blip,
// dropped webhook, etc.) and the order is stuck at payment_status = "awaiting_pin".
//
// Unlike mpesa-callback, this is synchronous — Safaricom answers immediately with
// ResultCode if the transaction has resolved, or an unresolved/error-shaped response
// if the customer hasn't finished entering their PIN yet.
//
// Admin-only: verifies the caller's JWT belongs to an admin/super_admin before doing
// anything, since a resolved "paid" result here writes payment_status the same way
// the callback does.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOCK_MODE = false; // must match mpesa-stk-push — real checkout_request_ids only make sense in real mode

const USER_CANCELLED_CODE = 1032;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const fail = (error: string, status = 400) => new Response(JSON.stringify({ success: false, error }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return fail("Missing Authorization header", 401);

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

        // Scoped to the caller's own JWT — used only to verify they're an admin.
        const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: isAdmin, error: roleErr } = await callerClient.rpc("is_admin_or_super");
        if (roleErr || !isAdmin) return fail("Admin access required", 403);

        const { order_id, order_type = "standard" } = await req.json();
        if (!order_id) return fail("order_id is required");

        const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const table = order_type === "custom" ? "custom_orders" : "orders";
        const isCustom = table === "custom_orders";

        const { data: order, error: orderErr } = await supabase
            .from(table)
            .select("*")
            .eq("id", order_id)
            .maybeSingle();

        if (orderErr || !order) return fail("Order not found", 404);

        // Already resolved — nothing to query, just report current state.
        if (order.payment_status === "paid" || order.payment_status === "failed" || order.payment_status === "cancelled") {
            return new Response(JSON.stringify({
                success: true, resolved: true, paymentStatus: order.payment_status,
                resultDesc: "Already resolved in the database.",
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (!order.mpesa_checkout_request_id) return fail("No M-Pesa STK push has been initiated for this order");

        // A mock-created checkout request has no real Daraja transaction behind it.
        if (MOCK_MODE || order.mpesa_checkout_request_id.startsWith("mock-")) {
            return new Response(JSON.stringify({
                success: true, resolved: false, paymentStatus: order.payment_status,
                resultDesc: "This is a mock checkout request — nothing to query on Daraja.",
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY")!;
        const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET")!;
        const shortcode = Deno.env.get("DARAJA_SHORTCODE")!;
        const passkey = Deno.env.get("DARAJA_PASSKEY")!;

        const tokenRes = await fetch(
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            { headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` } }
        );
        const { access_token } = await tokenRes.json();
        if (!access_token) return fail("Failed to authenticate with Daraja — check DARAJA_CONSUMER_KEY/DARAJA_CONSUMER_SECRET", 500);

        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
        const password = btoa(`${shortcode}${passkey}${timestamp}`);

        const queryRes = await fetch(
            "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query",
            {
                method: "POST",
                headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    BusinessShortCode: shortcode,
                    Password: password,
                    Timestamp: timestamp,
                    CheckoutRequestID: order.mpesa_checkout_request_id,
                }),
            }
        );
        const queryData = await queryRes.json();

        // No ResultCode in the body means Daraja hasn't resolved this transaction yet
        // (still waiting on the customer's PIN, or too soon after initiating).
        if (queryData.ResultCode === undefined || queryData.ResultCode === null) {
            return new Response(JSON.stringify({
                success: true, resolved: false, paymentStatus: order.payment_status,
                resultDesc: queryData.errorMessage || queryData.ResponseDescription || "Still being processed by Safaricom.",
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const resultCode = String(queryData.ResultCode);

        if (resultCode === "0") {
            // Paid. Query responses don't carry a receipt number (only the callback's
            // CallbackMetadata does) — if the callback shows up later its own update is
            // idempotent and will fill mpesa_receipt_number in.
            await supabase.from(table).update({
                payment_status: "paid",
                status: isCustom ? "deposit_paid" : "confirmed",
                ...(isCustom ? { deposit_paid: true } : {}),
            }).eq("id", order_id);

            const amount = isCustom ? order.deposit_amount : order.total_amount;

            if (order.user_id) {
                await supabase.from("order_notifications").insert({
                    user_id: order.user_id,
                    order_id,
                    order_type: isCustom ? "custom" : "standard",
                    type: "payment_received",
                    message: `Payment of KES ${amount} received (confirmed via manual status check). Receipt number pending.`,
                });
            }

            await supabase.functions.invoke("send-order-email", {
                body: { order_id, order_type: isCustom ? "custom" : "standard", type: "payment_received", amount },
            });

            return new Response(JSON.stringify({
                success: true, resolved: true, paymentStatus: "paid", resultDesc: queryData.ResultDesc,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Resolved, but not successful.
        const paymentStatus = resultCode === String(USER_CANCELLED_CODE) ? "cancelled" : "failed";
        await supabase.from(table).update({ payment_status: paymentStatus }).eq("id", order_id);

        return new Response(JSON.stringify({
            success: true, resolved: true, paymentStatus, resultDesc: queryData.ResultDesc,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
        return fail(String(err), 500);
    }
});
