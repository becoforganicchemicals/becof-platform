// supabase/functions/admin-adjust-points/index.ts
// Lets an admin manually add or deduct a customer's loyalty points (goodwill
// credit, correcting an error, etc.). loyalty_points grants no INSERT to
// authenticated/anon — this function, using the service role, is the only
// way such an adjustment can ever be written.

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
        const { data: isAdmin, error: roleErr } = await callerClient.rpc("is_admin_or_super");
        if (roleErr || !isAdmin) return fail("Admin access required", 403);

        const { user_id, points, description } = await req.json();
        if (!user_id || !points || points === 0) return fail("user_id and a non-zero points value are required");
        if (!description || !description.trim()) return fail("A reason/description is required for manual adjustments");

        const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

        const { data: target } = await supabase.from("profiles").select("user_id").eq("user_id", user_id).maybeSingle();
        if (!target) return fail("Customer not found", 404);

        const { error: insertErr } = await supabase.from("loyalty_points").insert({
            user_id,
            points,
            type: "admin_adjustment",
            description: description.trim(),
            expires_at: points > 0 ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null,
        });
        if (insertErr) return fail(insertErr.message, 500);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        return fail(String(err), 500);
    }
});
