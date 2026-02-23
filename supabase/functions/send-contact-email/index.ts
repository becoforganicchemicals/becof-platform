// supabase/functions/send-contact-email/index.ts
// Sends contact form submission to info@becoforganic.com
// and a confirmation to the sender

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Becof Website <noreply@becoforganicchemicals.com>";
const TEAM_EMAIL = "info@becoforganic.com";

const sendEmail = async (to: string, subject: string, html: string) => {
    if (!RESEND_API_KEY) {
        console.log("[MOCK EMAIL] To:", to, "| Subject:", subject);
        return;
    }
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) console.error("Resend error:", await res.text());
};

const brandHeader = `
  <div style="background:#166534;padding:24px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;font-family:Georgia,serif;">Becof Organic Chemicals</h1>
    <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;font-family:sans-serif;">Growing with Purpose</p>
  </div>
`;
const brandFooter = `
  <div style="background:#f1f5f9;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="color:#94a3b8;font-size:12px;font-family:sans-serif;margin:0;">
      © ${new Date().getFullYear()} Becof Organic Chemicals Limited · Nairobi & Kilifi, Kenya<br/>
      <a href="https://www.becoforganicchemicals.com" style="color:#16a34a;">www.becoforganicchemicals.com</a>
    </p>
  </div>
`;

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { name, email, phone, topic, message } = await req.json();

        // ── 1. Notify the Becof team ──
        await sendEmail(
            TEAM_EMAIL,
            `New Contact Form Message${topic ? ` – ${topic}` : ""} from ${name}`,
            `
      <div style="max-width:580px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        ${brandHeader}
        <div style="padding:32px;background:#fff;font-family:sans-serif;">
          <h2 style="color:#166534;margin:0 0 16px;font-size:18px;">New Website Inquiry</h2>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;width:120px;">Name</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;">Email</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">
                <a href="mailto:${email}" style="color:#16a34a;">${email}</a>
              </td>
            </tr>
            ${phone ? `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;">Phone</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">${phone}</td>
            </tr>
            ` : ""}
            ${topic ? `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:13px;">Topic</td>
              <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:14px;">
                <span style="background:#f0fdf4;color:#166534;padding:2px 10px;border-radius:20px;font-size:13px;font-weight:600;">${topic}</span>
              </td>
            </tr>
            ` : ""}
          </table>

          <div style="background:#f8fafc;border-left:4px solid #166534;border-radius:0 8px 8px 0;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
            <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;white-space:pre-line;">${message}</p>
          </div>

          <a href="mailto:${email}?subject=Re: Your inquiry to Becof Organic Chemicals"
            style="display:inline-block;background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Reply to ${name} →
          </a>
        </div>
        ${brandFooter}
      </div>
      `
        );

        // ── 2. Send confirmation to the sender ──
        await sendEmail(
            email,
            `We've received your message – Becof Organic Chemicals`,
            `
      <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        ${brandHeader}
        <div style="padding:32px;background:#fff;font-family:sans-serif;">
          <h2 style="color:#166534;margin:0 0 8px;font-family:Georgia,serif;font-size:22px;">
            Thank you, ${name}! 🌿
          </h2>
          <p style="color:#475569;margin:0 0 20px;font-size:15px;line-height:1.7;">
            We've received your message and a member of our team will get back to you 
            at <strong>${email}</strong> within <strong>24 hours</strong>.
          </p>

          ${topic ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
            <p style="margin:0;color:#166534;font-size:13px;">
              <strong>Your inquiry topic:</strong> ${topic}
            </p>
          </div>
          ` : ""}

          <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;">Your message</p>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;white-space:pre-line;">${message}</p>
          </div>

          <p style="color:#475569;font-size:14px;margin-bottom:6px;">In the meantime, you can:</p>
          <p style="color:#475569;font-size:14px;margin:0 0 4px;">
            📦 <a href="https://www.becoforganicchemicals.com/products" style="color:#16a34a;">Browse our products</a>
          </p>
          <p style="color:#475569;font-size:14px;margin:0 0 4px;">
            🌱 <a href="https://www.becoforganicchemicals.com/learn" style="color:#16a34a;">Read our learning resources</a>
          </p>
          <p style="color:#475569;font-size:14px;margin:0 0 20px;">
            🤝 <a href="https://www.becoforganicchemicals.com/partners" style="color:#16a34a;">Explore partnership opportunities</a>
          </p>

          <p style="color:#94a3b8;font-size:13px;margin:0;">
            For urgent matters, call us directly at <strong style="color:#475569;">+254 735 283 397</strong>
          </p>
        </div>
        ${brandFooter}
      </div>
      `
        );

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});