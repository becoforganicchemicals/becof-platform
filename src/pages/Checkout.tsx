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
import { ArrowLeft, CheckCircle } from "lucide-react";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const coupon = (location.state as any)?.coupon;
  const discount = (location.state as any)?.discount || 0;
  const total = subtotal - discount;

  const [form, setForm] = useState({ fullName: "", phone: "", address: "", city: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;
    if (!form.fullName || !form.phone || !form.address || !form.city) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);

    const shippingAddress = { full_name: form.fullName, phone: form.phone, address: form.address, city: form.city };

    // Create order
    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      user_id: user.id,
      total_amount: total,
      shipping_address: shippingAddress,
      notes: form.notes || null,
      coupon_id: coupon?.id || null,
      discount_amount: discount,
      payment_method: "pending",
    }).select("id").single();

    if (orderErr || !order) {
      toast.error("Failed to place order");
      setSubmitting(false);
      return;
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

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) {
      toast.error("Failed to save order items");
      setSubmitting(false);
      return;
    }

    // Increment coupon usage
    if (coupon) {
      await supabase.from("coupons").update({ current_uses: coupon.current_uses + 1 }).eq("id", coupon.id);
    }

    await clearCart();
    setOrderId(order.id);
    setOrderPlaced(true);
    setSubmitting(false);
  };

  if (!user) return <Layout><div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-4">Sign in to checkout</h1><Link to="/signin"><Button>Sign In</Button></Link></div></Layout>;

  if (orderPlaced) {
    return (
      <Layout>
        <div className="container py-20 text-center max-w-lg mx-auto">
          <CheckCircle className="h-16 w-16 text-secondary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Order Placed!</h1>
          <p className="text-muted-foreground mb-2">Your order has been received. Order #{orderId.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm text-muted-foreground mb-6">We'll notify you when your order is confirmed and dispatched.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/products"><Button variant="outline">Continue Shopping</Button></Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (items.length === 0) return <Layout><div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-4">Your cart is empty</h1><Link to="/products"><Button>Browse Products</Button></Link></div></Layout>;

  return (
    <Layout>
      <section className="py-10">
        <div className="container max-w-4xl">
          <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Cart
          </Link>
          <h1 className="text-3xl font-bold mb-8">Checkout</h1>

          <div className="grid md:grid-cols-5 gap-8">
            <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
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

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Placing Order..." : `Place Order · KES ${total.toLocaleString()}`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Payment will be collected upon delivery or via M-Pesa.</p>
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
                {discount > 0 && <div className="flex justify-between text-secondary"><span>Discount</span><span>-KES {discount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span className="text-primary">KES {total.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
