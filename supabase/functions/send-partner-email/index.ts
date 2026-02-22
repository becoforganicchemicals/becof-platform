// supabase/functions/send-partner-email/index.ts
// Handles all distributor partner application emails

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Becof Organic Chemicals <partners@becoforganicchemicals.com>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@becoforganicchemicals.com";
const PORTAL_URL = "https://www.becoforganicchemicals.com/distributor-portal";

const sendEmail = async (to: string, subject: string, html: string) => {
    if (!RESEND_API_KEY) {
        console.log("[MOCK EMAIL] To:", to, "Subject:", subject);
        return;
    }
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) console.error("Resend error:", await res.text());
};

const brandHeader = `
  <div style="background:#166534;padding:24px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;font-family:sans-serif;">Becof Organic Chemicals</h1>
    <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;font-family:sans-serif;">Distributor Partnership Programme</p>
  </div>
`;
const brandFooter = `
  <div style="background:#f1f5f9;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;font-family:sans-serif;margin:0;">
      © ${new Date().getFullYear()} Becof Organic Chemicals Limited · Nairobi, Kenya<br/>
      <a href="https://www.becoforganicchemicals.com" style="color:#16a34a;">www.becoforganicchemicals.com</a>
    </p>
  </div>
`;

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { application_id, type, temp_password, rejection_reason } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: app } = await supabase
            .from("distributor_applications")
            .select("*")
            .eq("id", application_id)
            .single();

        if (!app) throw new Error("Application not found");

        const appRef = application_id.slice(0, 8).toUpperCase();

        // ── Application Received ──
        if (type === "application_received") {
            await sendEmail(app.email, `Application Received – #${appRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Application Received 🌱</h2>
            <p style="color:#475569;margin:0 0 20px;">Dear ${app.full_name},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Thank you for applying to become a Becof Organic Chemicals distributor partner. 
              We have received your application and our team will review it carefully.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Reference: #${appRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Business: ${app.business_name || "N/A"}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Type: ${app.applicant_type?.replace(/_/g, " ")}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">County: ${app.county}</p>
            </div>
            <p style="color:#475569;font-size:14px;margin-bottom:20px;">
              <strong>What happens next?</strong><br/>
              Our partnerships team will review your application within <strong>5–10 business days</strong>. 
              You will receive an email notification once a decision has been made.
            </p>
            <p style="color:#475569;font-size:14px;">
              If you have any questions in the meantime, feel free to contact us at 
              <a href="mailto:partners@becoforganicchemicals.com" style="color:#16a34a;">partners@becoforganicchemicals.com</a>
            </p>
          </div>
          ${brandFooter}
        </div>
      `);

            // Notify admin
            await sendEmail(ADMIN_EMAIL, `New Distributor Application #${appRef} – ${app.full_name}`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 16px;">New Distributor Application</h2>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Ref #${appRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Name: ${app.full_name}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Business: ${app.business_name || "N/A"}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Type: ${app.applicant_type?.replace(/_/g, " ")}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">County: ${app.county}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Email: ${app.email}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Phone: ${app.phone}</p>
            </div>
            <a href="https://www.becoforganicchemicals.com/admin" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review in Admin Dashboard</a>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        // ── Application Under Review ──
        if (type === "application_reviewing") {
            await sendEmail(app.email, `Application Under Review – #${appRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Application Under Review 🔍</h2>
            <p style="color:#475569;margin:0 0 20px;">Dear ${app.full_name},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Your distributor application (Ref: <strong>#${appRef}</strong>) is currently being reviewed by our partnerships team.
              We will get back to you shortly with a final decision.
            </p>
            <p style="color:#475569;font-size:14px;">
              For any questions, contact us at 
              <a href="mailto:partners@becoforganicchemicals.com" style="color:#16a34a;">partners@becoforganicchemicals.com</a>
            </p>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        // ── Application Approved ──
        if (type === "application_approved") {
            // Create auth user account with temp password
            let loginEmail = app.email;

            if (temp_password) {
                // Create the user account
                const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
                    email: app.email,
                    password: temp_password,
                    email_confirm: true,
                    user_metadata: {
                        full_name: app.full_name,
                        role: "distributor",
                        application_id: application_id,
                    },
                });

                if (!userError && newUser?.user) {
                    // Assign distributor role
                    await supabase.from("user_roles").insert({
                        user_id: newUser.user.id,
                        role: "distributor",
                    });

                    // Link user to application
                    await supabase.from("distributor_applications").update({
                        user_id: newUser.user.id,
                        portal_account_created: true,
                        temp_password_sent: true,
                    }).eq("id", application_id);
                }
            }

            await sendEmail(app.email, `🎉 Application Approved – Welcome to Becof's Partner Network!`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Congratulations! You're Approved 🎉</h2>
            <p style="color:#475569;margin:0 0 20px;">Dear ${app.full_name},</p>
            <p style="color:#475569;margin:0 0 20px;">
              We are delighted to inform you that your application to become a Becof Organic Chemicals 
              distributor partner has been <strong style="color:#166534;">approved</strong>!
            </p>
            <p style="color:#475569;margin:0 0 20px;">
              Welcome to our growing network. Your distributor portal account has been created and is ready to use.
            </p>
            
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 12px;font-weight:700;color:#166534;font-size:16px;">Your Portal Login Credentials</p>
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Portal URL:</strong> <a href="${PORTAL_URL}" style="color:#16a34a;">${PORTAL_URL}</a></p>
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Email:</strong> ${app.email}</p>
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:13px;">${temp_password}</code></p>
              <p style="margin:12px 0 0;color:#dc2626;font-size:13px;font-weight:600;">
                ⚠️ You will be required to change this password immediately upon first login.
              </p>
            </div>

            <a href="${PORTAL_URL}" style="display:inline-block;background:#166534;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px;">
              Access Distributor Portal →
            </a>

            <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
              <p style="color:#475569;font-size:14px;margin:0 0 8px;"><strong>What's next?</strong></p>
              <p style="color:#475569;font-size:14px;margin:0 0 4px;">✓ Log in and change your password</p>
              <p style="color:#475569;font-size:14px;margin:0 0 4px;">✓ Complete your partner profile</p>
              <p style="color:#475569;font-size:14px;margin:0 0 4px;">✓ Our team will contact you within 2 business days to discuss onboarding</p>
              <p style="color:#475569;font-size:14px;margin:0;">✓ Attend the partner orientation session</p>
            </div>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        // ── Application Rejected ──
        if (type === "application_rejected") {
            await sendEmail(app.email, `Application Update – #${appRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Application Update</h2>
            <p style="color:#475569;margin:0 0 20px;">Dear ${app.full_name},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Thank you for your interest in becoming a Becof Organic Chemicals distributor partner 
              (Ref: <strong>#${appRef}</strong>).
            </p>
            <p style="color:#475569;margin:0 0 20px;">
              After careful review, we regret to inform you that we are unable to approve your 
              application at this time.
            </p>
            ${rejection_reason ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#dc2626;font-size:14px;">Reason:</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">${rejection_reason}</p>
            </div>
            ` : ""}
            <p style="color:#475569;font-size:14px;margin-bottom:20px;">
              You are welcome to reapply in the future if your circumstances change. 
              We encourage you to address the points raised and submit a new application after 6 months.
            </p>
            <p style="color:#475569;font-size:14px;">
              For further clarification, please contact our partnerships team at 
              <a href="mailto:partners@becoforganicchemicals.com" style="color:#16a34a;">partners@becoforganicchemicals.com</a>
            </p>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});