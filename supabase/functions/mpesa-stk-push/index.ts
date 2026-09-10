// supabase/functions/mpesa-stk-push/index.ts
// LIVE Daraja STK Push — production credentials, real money moves. Set MOCK_MODE = true
// to fall back to the simulated flow (e.g. for local/demo use without real payments).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOCK_MODE = false; // ← LIVE: real Daraja production API, real charges

// ── Real Daraja credentials (set these in Supabase Edge Function secrets) ──
// DARAJA_CONSUMER_KEY
// DARAJA_CONSUMER_SECRET
// DARAJA_SHORTCODE       → the real PayBill number
// DARAJA_PASSKEY         → production Lipa Na Mpesa Online passkey
// DARAJA_CALLBACK_URL    → https://<project>.supabase.co/functions/v1/mpesa-callback
//   (the mpesa-callback function handles this and marks the order paid/failed — see its
//   own file; it's deployed with verify_jwt = false in config.toml)

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { phone, amount, order_id, order_type = "standard" } = await req.json();

        if (!phone || !amount || !order_id) {
            return new Response(JSON.stringify({ error: "phone, amount and order_id are required" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Normalise phone → 2547XXXXXXXX
        const normalised = phone.replace(/^(\+?254|0)/, "254").replace(/\s/g, "");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        if (MOCK_MODE) {
            // ── MOCK: simulate STK push, auto-confirm after 5 s ──
            const mockCheckoutRequestId = `mock-${Date.now()}`;

            // Save checkout request id on the order
            const table = order_type === "custom" ? "custom_orders" : "orders";
            await supabase.from(table).update({
                mpesa_checkout_request_id: mockCheckoutRequestId,
                payment_status: "awaiting_pin",
                phone_number: normalised,
            }).eq("id", order_id);

            // Simulate async confirmation after 6 seconds using EdgeRuntime.waitUntil
            const confirmAsync = async () => {
                await new Promise(r => setTimeout(r, 6000));
                const mockReceipt = `MPX${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

                await supabase.from(table).update({
                    payment_status: "paid",
                    mpesa_receipt_number: mockReceipt,
                    status: order_type === "custom" ? "deposit_paid" : "confirmed",
                    ...(order_type === "custom" ? { deposit_paid: true, deposit_receipt: mockReceipt } : {}),
                }).eq("id", order_id);

                // Log notification for admin
                const { data: order } = await supabase.from(table).select("user_id").eq("id", order_id).single();
                if (order) {
                    await supabase.from("order_notifications").insert({
                        user_id: order.user_id,
                        order_id,
                        order_type,
                        type: "payment_received",
                        message: `Payment of KES ${amount} received. Receipt: ${mockReceipt}`,
                    });
                }

                // Trigger email
                await supabase.functions.invoke("send-order-email", {
                    body: { order_id, order_type, type: "payment_received", amount, receipt: mockReceipt },
                });
            };

            // @ts-ignore Deno runtime
            if (typeof EdgeRuntime !== "undefined") {
                // @ts-ignore
                EdgeRuntime.waitUntil(confirmAsync());
            } else {
                confirmAsync(); // fallback
            }

            return new Response(JSON.stringify({
                success: true,
                CheckoutRequestID: mockCheckoutRequestId,
                CustomerMessage: `[MOCK] STK push sent to ${normalised}. Enter PIN to confirm.`,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // ── REAL Daraja STK Push ──
        const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY")!;
        const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET")!;
        const shortcode = Deno.env.get("DARAJA_SHORTCODE")!;
        const passkey = Deno.env.get("DARAJA_PASSKEY")!;
        const callbackUrl = Deno.env.get("DARAJA_CALLBACK_URL")!;

        // Get access token
        const tokenRes = await fetch(
            "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            { headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` } }
        );
        const { access_token } = await tokenRes.json();

        if (!access_token) {
            return new Response(JSON.stringify({
                success: false,
                error: "Failed to authenticate with Daraja — check DARAJA_CONSUMER_KEY/DARAJA_CONSUMER_SECRET",
            }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
        const password = btoa(`${shortcode}${passkey}${timestamp}`);

        const stkRes = await fetch(
            "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                method: "POST",
                headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    BusinessShortCode: shortcode,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: Math.ceil(amount),
                    PartyA: normalised,
                    PartyB: shortcode,
                    PhoneNumber: normalised,
                    CallBackURL: callbackUrl,
                    AccountReference: `BECOF-${order_id.slice(0, 8).toUpperCase()}`,
                    TransactionDesc: "Becof Organic Chemicals Payment",
                }),
            }
        );

        const stkData = await stkRes.json();

        if (stkData.ResponseCode === "0") {
            const table = order_type === "custom" ? "custom_orders" : "orders";
            await supabase.from(table).update({
                mpesa_checkout_request_id: stkData.CheckoutRequestID,
                payment_status: "awaiting_pin",
                phone_number: normalised,
            }).eq("id", order_id);

            return new Response(JSON.stringify({
                success: true,
                CheckoutRequestID: stkData.CheckoutRequestID,
                CustomerMessage: stkData.CustomerMessage,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Daraja rejected the request (bad shortcode/passkey, invalid phone, etc.)
        return new Response(JSON.stringify({
            success: false,
            error: stkData.errorMessage || stkData.ResponseDescription || "STK push request failed",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});