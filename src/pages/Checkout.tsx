import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Smartphone, Loader2, RefreshCw } from "lucide-react";

type CheckoutStep = "details" | "mpesa" | "polling" | "success";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const coupon = (location.state as any)?.coupon;
  const discount = (location.state as any)?.discount || 0;
  const total = subtotal - discount;

  const [step, setStep] = useState<CheckoutStep>("details");
  const [form, setForm] = useState({ fullName: "", phone: "", address: "", city: "", notes: "" });
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [receipt, setReceipt] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /* ── Step 1: Create order, move to M-Pesa step ── */
  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    if (!form.fullName || !form.phone || !form.address || !form.city) {
      toast.error("Please fill all required fields"); return;
    }
    setSubmitting(true);

    const shippingAddress = {
      full_name: form.fullName, phone: form.phone,
      address: form.address, city: form.city,
    };

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      total_amount: total,
      shipping_address: shippingAddress,
      notes: form.notes || null,
      coupon_id: coupon?.id || null,
      discount_amount: discount,
      payment_method: "mpesa",
      payment_status: "pending",
      status: "received",
      order_type: "standard",
    }).select("id").single();

    if (error || !order) {
      toast.error("Failed to create order. Please try again.");
      setSubmitting(false); return;
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
    }));
    await supabase.from("order_items").insert(orderItems);

    // Increment coupon usage
    if (coupon) {
      await supabase.from("coupons").update({ current_uses: coupon.current_uses + 1 }).eq("id", coupon.id);
    }

    // Send order placed email
    await supabase.functions.invoke("send-order-email", {
      body: { order_id: order.id, order_type: "standard", type: "order_placed" },
    });

    setOrderId(order.id);
    setOrderRef(order.id.slice(0, 8).toUpperCase());
    setMpesaPhone(form.phone);
    setSubmitting(false);
    setStep("mpesa");
  };

  /* ── Step 2: Trigger STK Push ── */
  const handleStkPush = async () => {
    if (!mpesaPhone) { toast.error("Enter your M-Pesa phone number"); return; }
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
      body: { phone: mpesaPhone, amount: total, order_id: orderId, order_type: "standard" },
    });

    if (error || !data?.success) {
      toast.error("Failed to send payment request. Try again.");
      setSubmitting(false); return;
    }

    toast.success("Check your phone — enter your M-Pesa PIN to pay");
    setSubmitting(false);
    setStep("polling");
    setPollCount(0);
    pollForPayment();
  };

  /* ── Step 3: Poll DB for payment confirmation ── */
  const pollForPayment = () => {
    let attempts = 0;
    const maxAttempts = 20; // poll for ~60s

    const interval = setInterval(async () => {
      attempts++;
      setPollCount(attempts);

      const { data } = await supabase
        .from("orders")
        .select("payment_status, mpesa_receipt_number")
        .eq("id", orderId)
        .single();

      if (data?.payment_status === "paid") {
        clearInterval(interval);
        setReceipt(data.mpesa_receipt_number || "");
        await clearCart();
        setStep("success");
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        toast.error("Payment timeout. If you paid, check your orders in your profile.");
      }
    }, 3000);
  };

  if (!user) return (
    <Layout>
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign in to checkout</h1>
        <Link to="/signin"><Button>Sign In</Button></Link>
      </div>
    </Layout>
  );

  if (items.length === 0 && step === "details") return (
    <Layout>
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link to="/products"><Button>Browse Products</Button></Link>
      </div>
    </Layout>
  );

  /* ── SUCCESS ── */
  if (step === "success") return (
    <Layout>
      <div className="container py-20 max-w-lg mx-auto text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Confirmed!</h1>
          <p className="text-slate-500 mb-1">Order #{orderRef}</p>
          {receipt && <p className="text-sm text-emerald-600 font-medium mb-4">M-Pesa Receipt: {receipt}</p>}
          <p className="text-sm text-slate-500 mb-8">
            A confirmation email has been sent to you. We'll notify you when your order is dispatched.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/profile"><Button variant="outline">View My Orders</Button></Link>
            <Link to="/products"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Continue Shopping</Button></Link>
          </div>
        </div>
      </div>
    </Layout>
  );

  /* ── POLLING ── */
  if (step === "polling") return (
    <Layout>
      <div className="container py-20 max-w-lg mx-auto text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Enter Your PIN</h1>
          <p className="text-slate-500 mb-6">
            An M-Pesa prompt has been sent to <span className="font-semibold text-slate-700">{mpesaPhone}</span>.<br />
            Please enter your PIN to complete payment of <span className="font-semibold text-emerald-600">KES {total.toLocaleString()}</span>.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for payment confirmation…
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left text-sm">
            <p className="font-medium text-slate-700 mb-1">Paying to:</p>
            <p className="text-slate-600">Becof Organic Chemicals Limited</p>
            <p className="text-slate-500 text-xs mt-1">Order #{orderRef}</p>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => { setPollCount(0); handleStkPush(); }}
          >
            <RefreshCw className="h-4 w-4" /> Resend Payment Request
          </Button>
          <p className="text-xs text-slate-400 mt-3">
            Didn't receive a prompt? Check your phone is on and has M-Pesa enabled, then resend.
          </p>
        </div>
      </div>
    </Layout>
  );

  /* ── MPESA STEP ── */
  if (step === "mpesa") return (
    <Layout>
      <div className="container py-10 max-w-lg mx-auto">
        <button onClick={() => setStep("details")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to details
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pay via M-Pesa</h1>
              <p className="text-sm text-slate-500">Order #{orderRef}</p>
            </div>
          </div>

          {/* Amount summary */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Amount to Pay</span>
              <span className="text-2xl font-bold text-emerald-700">KES {total.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <p className="text-xs text-emerald-600 mt-1">Includes discount of KES {discount.toLocaleString()}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="mpesaPhone" className="text-sm font-medium text-slate-700">
                M-Pesa Phone Number
              </Label>
              <Input
                id="mpesaPhone"
                placeholder="07XX XXX XXX or 2547XX XXX XXX"
                value={mpesaPhone}
                onChange={e => setMpesaPhone(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">
                You will receive an STK push on this number to enter your PIN.
              </p>
            </div>

            <Button
              onClick={handleStkPush}
              disabled={submitting || !mpesaPhone}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              {submitting ? "Sending request…" : "Send M-Pesa Request"}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">How it works:</p>
            <p>1. Click "Send M-Pesa Request"</p>
            <p>2. A pop-up will appear on your phone</p>
            <p>3. Enter your M-Pesa PIN to confirm payment</p>
            <p>4. You'll receive a confirmation SMS from M-Pesa</p>
          </div>
        </div>
      </div>
    </Layout>
  );

  /* ── DETAILS STEP ── */
  return (
    <Layout>
      <section className="py-10">
        <div className="container max-w-4xl">
          <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Cart
          </Link>
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <div className="grid md:grid-cols-5 gap-8">
            <form onSubmit={handleSubmitDetails} className="md:col-span-3 space-y-4">
              <h2 className="font-semibold text-lg">Shipping Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="+254..." />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input id="address" name="address" value={form.address} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="city">City / Town *</Label>
                <Input id="city" name="city" value={form.city} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="notes">Order Notes (optional)</Label>
                <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Special delivery instructions..." />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">📦 Delivery Fee</p>
                <p>Delivery is not free. Our sales team will contact you to confirm the delivery fee based on your location before dispatch.</p>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</> : `Continue to Payment · KES ${total.toLocaleString()}`}
              </Button>
            </form>

            {/* Order Summary */}
            <div className="md:col-span-2 bg-card rounded-xl border border-border p-5 h-fit sticky top-20 space-y-3">
              <h2 className="font-semibold">Order Summary ({items.length} items)</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.product.name} × {item.quantity}</span>
                    <span>KES {(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-KES {discount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span className="text-emerald-600">KES {total.toLocaleString()}</span></div>
              </div>
              <p className="text-xs text-slate-400 pt-2">+ Delivery fee (confirmed by sales team)</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
