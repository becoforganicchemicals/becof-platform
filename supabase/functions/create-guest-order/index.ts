// supabase/functions/create-guest-order/index.ts
// Creates a standard order with no account attached (user_id stays null) —
// the guest-checkout equivalent of the direct client-side insert Checkout.tsx
// does for a signed-in user. Routed through this edge function (service
// role) instead of an anon RLS policy so the existing "Users can create
// orders" / "Users can view own orders" policies on orders/order_items never
// need to change for authenticated users — a guest-checkout RLS tweak can't
// subtly break the logged-in flow if there isn't one.
//
// Trusts the client-computed total_amount, same as the logged-in checkout
// path already does (mpesa-stk-push charges that same amount) — this isn't
// more or less trusting than the existing flow, just a different write path
// for when there's no session to authorize a client-side insert with.
//
// Deliberately does NOT touch coupon usage or loyalty points — coupon
// incrementing already happens generically in mpesa-callback/mpesa-stk-query
// keyed off order.coupon_id (not user_id), at the moment payment actually
// clears, so it already covers guest orders correctly. Doing it here too
// would double-increment, and re-introduce the exact "coupon burned before
// payment succeeds" bug that was fixed earlier for the logged-in flow.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        const { email, phone, full_name, address, city, notes, items, total_amount, delivery_fee, coupon_id, discount_amount, affiliate_id } = await req.json();

        if (!email || !String(email).trim()) return fail("Email is required");
        if (!phone || !full_name || !address || !city) return fail("Missing required shipping/contact details");
        if (!Array.isArray(items) || items.length === 0) return fail("Cart is empty");
        if (typeof total_amount !== "number" || total_amount <= 0) return fail("Invalid order total");
        if (delivery_fee !== undefined && (typeof delivery_fee !== "number" || delivery_fee < 0)) return fail("Invalid delivery fee");
        for (const item of items) {
            if (!item?.product_id || !item?.quantity || !item?.product_name || typeof item?.unit_price !== "number") {
                return fail("Invalid cart item");
            }
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const shipping_address = { full_name, phone, address, city };

        const { data: order, error: orderErr } = await supabase.from("orders").insert({
            user_id: null,
            email: String(email).trim(),
            total_amount,
            delivery_fee: delivery_fee || 0,
            shipping_address,
            notes: notes || null,
            coupon_id: coupon_id || null,
            discount_amount: discount_amount || 0,
            payment_method: "mpesa",
            payment_status: "pending",
            status: "received",
            order_type: "standard",
            affiliate_id: affiliate_id || null,
        }).select("id").single();

        if (orderErr || !order) return fail(orderErr?.message || "Failed to create order", 500);

        const orderItems = items.map((item: any) => ({
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
        }));
        const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
        if (itemsErr) {
            // Order row exists but its items failed — better to leave a
            // traceable orphaned "received" order for admin to spot than to
            // silently report success with no line items on it.
            return fail(itemsErr.message, 500);
        }

        return new Response(JSON.stringify({ success: true, order_id: order.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        return fail(String(err), 500);
    }
});
