// supabase/functions/send-affiliate-email/index.ts
// Sends transactional emails for the affiliate programme via Resend.
// Mirrors send-partner-email's shape, but affiliates apply from an existing
// account (AffiliateTab.tsx, inside /profile) rather than a public form, so
// there's no account-provisioning step here — just notify the applicant's
// existing auth.users email, resolved via user_id (the affiliates table has
// no email column of its own, same as orders resolving guest vs account email).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Becof Organic Chemicals Limited <affiliate@becoforganicchemicals.com>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@becoforganicchemicals.com";
const SITE_URL = "https://www.becoforganicchemicals.com";

// Every attempt is recorded here so the caller can tell whether an email
// actually went out, instead of always responding 200 regardless of a
// missing recipient, a missing API key, or Resend rejecting the request.
type SendResult = { to: string; ok: boolean; mocked: boolean; error?: string };
const sendResults: SendResult[] = [];

const sendEmail = async (to: string, subject: string, html: string) => {
    if (!to) {
        console.warn("[send-affiliate-email] Skipped — no recipient email:", subject);
        sendResults.push({ to: "", ok: false, mocked: false, error: "missing recipient email" });
        return;
    }
    if (!RESEND_API_KEY) {
        console.log("[MOCK EMAIL] To:", to, "Subject:", subject);
        sendResults.push({ to, ok: false, mocked: true });
        return;
    }
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[send-affiliate-email] Resend API error", res.status, body);
        sendResults.push({ to, ok: false, mocked: false, error: `Resend ${res.status}: ${body}` });
        return;
    }
    sendResults.push({ to, ok: true, mocked: false });
};

const brandHeader = `
  <div style="background:#166534;padding:24px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;font-family:sans-serif;">Becof Organic Chemicals</h1>
    <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;font-family:sans-serif;">Affiliate Programme</p>
  </div>
`;
const brandFooter = `
  <div style="background:#f1f5f9;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;font-family:sans-serif;margin:0;">
      © ${new Date().getFullYear()} Becof Organic Chemicals Limited · Nairobi, Kenya<br/>
      <a href="${SITE_URL}" style="color:#16a34a;">www.becoforganicchemicals.com</a>
    </p>
  </div>
`;

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { affiliate_id, type } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: affiliate } = await supabase
            .from("affiliates")
            .select("*")
            .eq("id", affiliate_id)
            .single();
        if (!affiliate) throw new Error("Affiliate not found");

        const { data: userData } = await supabase.auth.admin.getUserById(affiliate.user_id);
        const applicantEmail = userData?.user?.email || "";

        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", affiliate.user_id)
            .maybeSingle();
        const fullName = profile?.full_name || "there";

        const appRef = affiliate.id.slice(0, 8).toUpperCase();

        // ── Application Received ──
        if (type === "application_received") {
            await sendEmail(applicantEmail, `Affiliate Application Received – #${appRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Application Received 📣</h2>
            <p style="color:#475569;margin:0 0 20px;">Hi ${fullName},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Thank you for applying to become a Becof Organic Chemicals affiliate.
              We've received your application and our team will review it shortly.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Reference: #${appRef}</p>
              ${affiliate.business_name ? `<p style="margin:4px 0 0;color:#475569;font-size:14px;">Business: ${affiliate.business_name}</p>` : ""}
            </div>
            <p style="color:#475569;font-size:14px;">
              We typically review applications within 5–10 business days. You'll see your affiliate
              link and dashboard on your profile page once approved.
            </p>
          </div>
          ${brandFooter}
        </div>
      `);

            // Notify admin
            await sendEmail(ADMIN_EMAIL, `New Affiliate Application #${appRef} – ${fullName}`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 16px;">New Affiliate Application</h2>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Ref #${appRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Name: ${fullName}</p>
              ${affiliate.business_name ? `<p style="margin:4px 0 0;color:#475569;font-size:14px;">Business: ${affiliate.business_name}</p>` : ""}
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Email: ${applicantEmail}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">M-Pesa: ${affiliate.mpesa_phone || "N/A"}</p>
              ${affiliate.application_note ? `<p style="margin:4px 0 0;color:#475569;font-size:14px;">Note: ${affiliate.application_note}</p>` : ""}
            </div>
            <a href="${SITE_URL}/admin" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review in Admin Dashboard</a>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        // ── Application Approved ──
        if (type === "application_approved") {
            const link = `${SITE_URL}/?aff=${affiliate.code}`;
            await sendEmail(applicantEmail, `🎉 You're Approved – Becof Affiliate Programme`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Congratulations, You're Approved! 🎉</h2>
            <p style="color:#475569;margin:0 0 20px;">Hi ${fullName},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Your application to become a Becof Organic Chemicals affiliate has been
              <strong style="color:#166534;">approved</strong>. Welcome to the programme!
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-weight:700;color:#166534;font-size:16px;">Your Affiliate Link</p>
              <p style="margin:0 0 4px;word-break:break-all;color:#475569;font-size:14px;"><a href="${link}" style="color:#16a34a;">${link}</a></p>
              <p style="margin:12px 0 0;color:#475569;font-size:14px;">
                Commission rate: <strong>${(Number(affiliate.commission_rate) * 100).toFixed(0)}%</strong> on every
                order that's delivered and paid for.
              </p>
            </div>
            <a href="${SITE_URL}/profile" style="display:inline-block;background:#166534;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              View Your Dashboard →
            </a>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        // ── Application Rejected ──
        if (type === "application_rejected") {
            await sendEmail(applicantEmail, `Affiliate Application Update – #${appRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Application Update</h2>
            <p style="color:#475569;margin:0 0 20px;">Hi ${fullName},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Thank you for your interest in the Becof Organic Chemicals affiliate programme
              (Ref: <strong>#${appRef}</strong>).
            </p>
            <p style="color:#475569;margin:0 0 20px;">
              After review, we're unable to approve your application at this time.
            </p>
            ${affiliate.admin_note ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#dc2626;font-size:14px;">Note:</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">${affiliate.admin_note}</p>
            </div>
            ` : ""}
            <p style="color:#475569;font-size:14px;">
              You're welcome to reapply in the future. For any questions, contact us at
              <a href="mailto:affiliate@becoforganicchemicals.com" style="color:#16a34a;">affiliate@becoforganicchemicals.com</a>
            </p>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        const success = sendResults.some(r => r.ok);
        return new Response(JSON.stringify({
            success,
            mocked: sendResults.some(r => r.mocked),
            missingRecipient: sendResults.some(r => r.error === "missing recipient email"),
            results: sendResults,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
