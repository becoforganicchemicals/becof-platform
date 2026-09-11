// supabase/functions/request-affiliate-payout/index.ts
// Atomically turns an affiliate's outstanding "payable" commissions into a
// payout request. affiliate_payouts grants no INSERT to authenticated/anon
// (see its migration) — only this function, using the service role, can
// ever create one, so the balance calculated here is the actual source of
// truth, not just a client-side courtesy check.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_PAYOUT_KES = 1000;

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

        const { mpesa_phone } = await req.json();
        if (!mpesa_phone || !String(mpesa_phone).trim()) return fail("An M-Pesa phone number is required");

        const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const { data: affiliate } = await supabase
            .from("affiliates")
            .select("id, status")
            .eq("user_id", user.id)
            .maybeSingle();
        if (!affiliate) return fail("You don't have an affiliate account", 404);
        if (affiliate.status !== "approved") return fail("Your affiliate account isn't approved yet");

        const { data: commissions } = await supabase
            .from("affiliate_commissions")
            .select("id, commission_amount")
            .eq("affiliate_id", affiliate.id)
            .eq("status", "payable")
            .is("payout_id", null);

        const rows = commissions || [];
        const balance = rows.reduce((sum, r) => sum + Number(r.commission_amount), 0);

        if (balance < MIN_PAYOUT_KES) {
            return fail(`Minimum payout is KES ${MIN_PAYOUT_KES.toLocaleString()} (you have KES ${balance.toLocaleString()} payable)`);
        }
        if (rows.length === 0) return fail("No payable commissions to pay out");

        const { data: payout, error: payoutErr } = await supabase
            .from("affiliate_payouts")
            .insert({ affiliate_id: affiliate.id, amount: balance, mpesa_phone: String(mpesa_phone).trim() })
            .select("id, amount")
            .single();
        if (payoutErr || !payout) return fail(payoutErr?.message || "Failed to create payout request", 500);

        const { error: linkErr } = await supabase
            .from("affiliate_commissions")
            .update({ payout_id: payout.id })
            .in("id", rows.map((r) => r.id));
        if (linkErr) return fail(linkErr.message, 500);

        return new Response(JSON.stringify({ success: true, amount: payout.amount }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        return fail(String(err), 500);
    }
});
