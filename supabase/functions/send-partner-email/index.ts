import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Becof Organic Chemicals Limited <info@becoforganic.com>";
const CC_EMAIL = "mweri@becoforganic.com";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@becoforganicchemicals.com";
const SITE_URL = "https://www.becoforganicchemicals.com";

const sendEmail = async (to: string, subject: string, html: string, cc?: string | string[]) => {
  if (!RESEND_API_KEY) {
    console.log("[MOCK EMAIL] To:", to, "CC:", cc, "Subject:", subject);
    return;
  }
  const payload: Record<string, unknown> = { from: FROM_EMAIL, to, subject, html };
  if (cc) payload.cc = Array.isArray(cc) ? cc : [cc];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
};

const brandHeader = `
  <div style="background:#166534;padding:24px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;font-family:sans-serif;">Becof Organic Chemicals Limited</h1>
    <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;font-family:sans-serif;">Distributor Partnership Programme</p>
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
    const { application_id, type, temp_password, rejection_reason, admin_user_id } = await req.json();

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
            <p style="color:#475569;font-size:14px;margin-bottom:20px;">
              You can check your application status anytime at:<br/>
              <a href="${SITE_URL}/application-status" style="color:#16a34a;">${SITE_URL}/application-status</a>
            </p>
            <p style="color:#475569;font-size:14px;">
              If you have any questions, contact us at
              <a href="mailto:info@becoforganic.com" style="color:#16a34a;">info@becoforganic.com</a>
            </p>
          </div>
          ${brandFooter}
        </div>
      `, CC_EMAIL);

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
            <a href="${SITE_URL}/admin" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review in Admin Dashboard</a>
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
              <a href="mailto:info@becoforganic.com" style="color:#16a34a;">info@becoforganic.com</a>
            </p>
          </div>
          ${brandFooter}
        </div>
      `, CC_EMAIL);
    }

    // ── Application Approved ──
    if (type === "application_approved") {
      // IDEMPOTENCY: Only create user if not already created
      if (app.portal_account_created) {
        console.log("Account already created for application", application_id, "— skipping user creation");
      } else if (temp_password) {
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

        if (userError) {
          console.error("Error creating user:", userError.message);
          // If user already exists, try to find them
          if (userError.message?.includes("already been registered")) {
            console.log("User already exists, skipping creation");
          } else {
            throw userError;
          }
        }

        if (!userError && newUser?.user) {
          // DO NOT insert into user_roles here — the handle_new_user_role trigger handles it
          // DO NOT insert into profiles here — the handle_new_user trigger handles it

          // Set must_change_password flag on their profile (trigger creates it)
          // Small delay to let trigger fire
          await new Promise(r => setTimeout(r, 500));
          await supabase.from("profiles").update({
            must_change_password: true,
            business_name: app.business_name || null,
            business_location: [app.town, app.county].filter(Boolean).join(", ") || null,
            full_name: app.full_name,
            phone: app.phone,
          }).eq("user_id", newUser.user.id);

          // Link user to application
          await supabase.from("distributor_applications").update({
            user_id: newUser.user.id,
            portal_account_created: true,
            temp_password_sent: true,
          }).eq("id", application_id);

          // Auto-create partner_profile from application data
          await supabase.from("partner_profiles").insert({
            application_id: application_id,
            display_name: app.business_name || app.full_name,
            phone: app.phone,
            email: app.email,
            county: app.county,
            town: app.town || null,
            partner_type: app.applicant_type?.replace(/_/g, " ") || null,
            products: app.products_interest || [],
            description: app.motivation || null,
            published: false,
            featured: false,
          });
        }
      }

      const loginUrl = `${SITE_URL}/signin`;

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
              Welcome to our growing network. Your account has been created and is ready to use.
            </p>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 12px;font-weight:700;color:#166534;font-size:16px;">Your Login Credentials</p>
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Sign In:</strong> <a href="${loginUrl}" style="color:#16a34a;">${loginUrl}</a></p>
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Email:</strong> ${app.email}</p>
              ${temp_password && !app.portal_account_created ? `
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:13px;">${temp_password}</code></p>
              <p style="margin:12px 0 0;color:#dc2626;font-size:13px;font-weight:600;">
                ⚠️ You will be required to change this password immediately upon first login.
              </p>
              ` : `
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Use the credentials provided in your original approval email.</p>
              `}
            </div>

            <a href="${loginUrl}" style="display:inline-block;background:#166534;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px;">
              Sign In to Your Account →
            </a>

            <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
              <p style="color:#475569;font-size:14px;margin:0 0 8px;"><strong>What's next?</strong></p>
              <p style="color:#475569;font-size:14px;margin:0 0 4px;">✓ Sign in and change your password</p>
              <p style="color:#475569;font-size:14px;margin:0 0 4px;">✓ Complete your partner profile</p>
              <p style="color:#475569;font-size:14px;margin:0 0 4px;">✓ Our team will contact you within 2 business days to discuss onboarding</p>
            </div>
          </div>
          ${brandFooter}
        </div>
      `, CC_EMAIL);
    }

    // ── Resend Credentials (does NOT create a new user) ──
    if (type === "resend_credentials") {
      if (!app.portal_account_created || !app.user_id) {
        throw new Error("Cannot resend credentials — account has not been created yet");
      }

      // Reset password via admin API
      if (temp_password) {
        const { error: updateErr } = await supabase.auth.admin.updateUserById(app.user_id, {
          password: temp_password,
        });
        if (updateErr) {
          console.error("Error resetting password:", updateErr.message);
          throw updateErr;
        }

        // Set must_change_password again
        await supabase.from("profiles").update({ must_change_password: true }).eq("user_id", app.user_id);
      }

      const loginUrl = `${SITE_URL}/signin`;

      await sendEmail(app.email, `Your Updated Login Credentials – Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Updated Login Credentials</h2>
            <p style="color:#475569;margin:0 0 20px;">Dear ${app.full_name},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Your login credentials for the Becof distributor portal have been reset.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Sign In:</strong> <a href="${loginUrl}" style="color:#16a34a;">${loginUrl}</a></p>
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Email:</strong> ${app.email}</p>
              <p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>New Temporary Password:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:13px;">${temp_password}</code></p>
              <p style="margin:12px 0 0;color:#dc2626;font-size:13px;font-weight:600;">
                ⚠️ You must change this password upon login.
              </p>
            </div>
            <a href="${loginUrl}" style="display:inline-block;background:#166534;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Sign In Now →
            </a>
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
