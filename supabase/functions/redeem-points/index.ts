// supabase/functions/redeem-points/index.ts
// Atomically deducts loyalty points for a checkout redemption. The
// loyalty_points table grants no INSERT to authenticated/anon (see its
// migration) — only this function, using the service role, can ever write
// a redemption row, so the balance check below is the actual source of
// truth, not just a client-side courtesy check.

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
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return fail("Missing Authorization header", 401);

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

        const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: userErr } = await callerClient.auth.getUser();
        if (userErr || !user) return fail("Not authenticated", 401);

        const { order_id, points } = await req.json();
        if (!order_id || !points || points <= 0) return fail("order_id and a positive points value are required");

        const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const { data: order } = await supabase
            .from("orders")
            .select("id, user_id, points_redeemed")
            .eq("id", order_id)
            .maybeSingle();

        if (!order || order.user_id !== user.id) return fail("Order not found", 404);
        if (order.points_redeemed && order.points_redeemed > 0) return fail("Points already redeemed on this order");

        const { data: ledger } = await supabase
            .from("loyalty_points")
            .select("points, type, expires_at")
            .eq("user_id", user.id);

        const now = new Date();
        const balance = (ledger || []).reduce((sum, row) => {
            const valid = row.type === "redemption" || !row.expires_at || new Date(row.expires_at) > now;
            return valid ? sum + row.points : sum;
        }, 0);

        if (points > balance) {
            return fail(`Insufficient points balance (have ${balance}, requested ${points})`);
        }

        const { error: insertErr } = await supabase.from("loyalty_points").insert({
            user_id: user.id,
            points: -points,
            type: "redemption",
            order_id,
            description: `Redeemed on order #${String(order_id).slice(0, 8).toUpperCase()}`,
        });
        if (insertErr) return fail(insertErr.message, 500);

        return new Response(JSON.stringify({ success: true, pointsRedeemed: points }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        return fail(String(err), 500);
    }
});
