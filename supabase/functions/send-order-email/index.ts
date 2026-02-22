// supabase/functions/send-order-email/index.ts
// Sends transactional emails via Resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Becof Organic Chemicals <orders@becoforganicchemicals.com>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@becoforganicchemicals.com";

const sendEmail = async (to: string, subject: string, html: string) => {
    if (!RESEND_API_KEY) {
        console.log("[MOCK EMAIL] To:", to, "Subject:", subject);
        return;
    }
    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
};

const brandHeader = `
  <div style="background:#166534;padding:24px 32px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;font-family:sans-serif;">Becof Organic Chemicals</h1>
    <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px;font-family:sans-serif;">Growing with Purpose</p>
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
        const { order_id, order_type = "standard", type, amount, receipt, deposit_amount, status_label } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Fetch order + user email
        const table = order_type === "custom" ? "custom_orders" : "orders";
        const { data: order } = await supabase.from(table).select("*").eq("id", order_id).single();
        if (!order) throw new Error("Order not found");

        let customerEmail = order.email || "";
        if (!customerEmail && order.user_id) {
            const { data: userData } = await supabase.auth.admin.getUserById(order.user_id);
            customerEmail = userData?.user?.email || "";
        }

        const orderRef = order_id.slice(0, 8).toUpperCase();

        // ── Email templates by type ──
        if (type === "order_placed") {
            await sendEmail(customerEmail, `Order Received – #${orderRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Order Received! 🌿</h2>
            <p style="color:#475569;margin:0 0 20px;">Hi ${order.shipping_address?.full_name || "Valued Customer"},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Thank you for your order. We've received it and it's being processed.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;color:#166534;font-weight:600;">Order #${orderRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Total: KES ${order.total_amount?.toLocaleString()}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Status: Pending Payment</p>
            </div>
            <p style="color:#475569;font-size:14px;">
              Please complete your M-Pesa payment to confirm your order. You can track your order status by logging into your account.
            </p>
          </div>
          ${brandFooter}
        </div>
      `);

            // Notify admins
            await sendEmail(ADMIN_EMAIL, `New Order #${orderRef} – KES ${order.total_amount?.toLocaleString()}`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 16px;">New Order Received</h2>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Order #${orderRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Amount: KES ${order.total_amount?.toLocaleString()}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Customer: ${order.shipping_address?.full_name}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Phone: ${order.shipping_address?.phone}</p>
            </div>
            <a href="https://www.becoforganicchemicals.com/admin" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View in Admin Dashboard</a>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        if (type === "payment_received") {
            await sendEmail(customerEmail, `Payment Confirmed – #${orderRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Payment Confirmed ✓</h2>
            <p style="color:#475569;margin:0 0 20px;">Your M-Pesa payment has been received successfully.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Receipt: ${receipt}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Amount Paid: KES ${Number(amount).toLocaleString()}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Order #${orderRef}</p>
            </div>
            <p style="color:#475569;font-size:14px;">
              We will process your order and notify you when it's dispatched. 
              For any queries, contact us at support@becoforganicchemicals.com
            </p>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        if (type === "order_status_update") {
            await sendEmail(customerEmail, `Order Update – #${orderRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Order Update</h2>
            <p style="color:#475569;margin:0 0 20px;">Your order #${orderRef} has been updated.</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">New Status: ${status_label}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Order #${orderRef}</p>
            </div>
            <a href="https://www.becoforganicchemicals.com/profile" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View My Orders</a>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        if (type === "custom_order_placed") {
            await sendEmail(customerEmail || order.email, `Custom Order Received – #${orderRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Custom Order Received 🌱</h2>
            <p style="color:#475569;margin:0 0 20px;">Hi ${order.full_name},</p>
            <p style="color:#475569;margin:0 0 20px;">
              We've received your custom order request for <strong>${order.product_name}</strong>. 
              Our team will review it and get back to you shortly.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Reference #${orderRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Product: ${order.product_name}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Quantity: ${order.quantity} ${order.unit || ""}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Delivery to: ${order.delivery_address}, ${order.city}</p>
            </div>
            <p style="color:#475569;font-size:14px;">
              <strong>Next steps:</strong> Our sales team will contact you on <strong>${order.phone}</strong> 
              to discuss availability, pricing, delivery fees, and deposit amount.
            </p>
          </div>
          ${brandFooter}
        </div>
      `);

            // Notify admins of new custom order
            await sendEmail(ADMIN_EMAIL, `New Custom Order #${orderRef} – ${order.product_name}`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 16px;">New Custom Order</h2>
            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#92400e;">Requires Review</p>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Reference #${orderRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Product: ${order.product_name}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Qty: ${order.quantity} ${order.unit || ""}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Customer: ${order.full_name}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Phone: ${order.phone}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Email: ${order.email || "N/A"}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Delivery: ${order.delivery_address}, ${order.city}</p>
              ${order.notes ? `<p style="margin:4px 0 0;color:#475569;font-size:14px;">Notes: ${order.notes}</p>` : ""}
            </div>
            <a href="https://www.becoforganicchemicals.com/admin" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Review in Admin Dashboard</a>
          </div>
          ${brandFooter}
        </div>
      `);
        }

        if (type === "custom_order_ready") {
            await sendEmail(customerEmail || order.email, `Your Custom Order is Ready – #${orderRef} | Becof Organic Chemicals`, `
        <div style="max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          ${brandHeader}
          <div style="padding:32px;background:#fff;font-family:sans-serif;">
            <h2 style="color:#166534;margin:0 0 8px;">Your Order is Ready! 🎉</h2>
            <p style="color:#475569;margin:0 0 20px;">Hi ${order.full_name},</p>
            <p style="color:#475569;margin:0 0 20px;">
              Great news! Your custom order for <strong>${order.product_name}</strong> is ready.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-weight:600;color:#166534;">Deposit Required: KES ${Number(deposit_amount || order.deposit_amount).toLocaleString()}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Order #${orderRef}</p>
              <p style="margin:4px 0 0;color:#475569;font-size:14px;">Product: ${order.product_name}</p>
            </div>
            <p style="color:#475569;font-size:14px;margin-bottom:20px;">
              Please log in to your account to pay the deposit and confirm your order. 
              Our sales team may also call you to arrange delivery details.
            </p>
            <a href="https://www.becoforganicchemicals.com/profile" style="background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Pay Deposit Now</a>
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