import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Cart = () => {
  const { user } = useAuth();
  const { items, loading, subtotal, updateQuantity, removeFromCart } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    const { data } = await supabase.from("coupons").select("*").eq("code", couponCode.trim().toUpperCase()).eq("is_active", true).maybeSingle();
    if (!data) { toast.error("Invalid or expired coupon"); setApplyingCoupon(false); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("Coupon has expired"); setApplyingCoupon(false); return; }
    if (data.max_uses && data.current_uses >= data.max_uses) { toast.error("Coupon usage limit reached"); setApplyingCoupon(false); return; }
    if (data.min_order_amount && subtotal < Number(data.min_order_amount)) { toast.error(`Minimum order of KES ${Number(data.min_order_amount).toLocaleString()} required`); setApplyingCoupon(false); return; }

    const disc = data.discount_type === "percentage" ? subtotal * Number(data.discount_value) / 100 : Number(data.discount_value);
    setDiscount(Math.min(disc, subtotal));
    setAppliedCoupon(data);
    toast.success("Coupon applied!");
    setApplyingCoupon(false);
  };

  const removeCoupon = () => { setDiscount(0); setAppliedCoupon(null); setCouponCode(""); };
  const total = subtotal - discount;

  if (!user) return <Layout><div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-4">Sign in to view your cart</h1><Link to="/signin"><Button>Sign In</Button></Link></div></Layout>;
  
  if (loading) return <Layout><div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></Layout>;

  if (items.length === 0) return (
    <Layout>
      <div className="container py-20 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Browse our products and add items to get started.</p>
        <Link to="/products"><Button>Browse Products</Button></Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <section className="py-10">
        <div className="container">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex gap-4 p-4 bg-card rounded-xl border border-border">
                  <Link to={`/products/${item.product.slug}`} className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={item.product.images?.[0] || "/placeholder.svg"} alt={item.product.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.product.slug}`} className="font-semibold hover:text-primary">{item.product.name}</Link>
                    <p className="text-primary font-bold mt-1">KES {item.product.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-border rounded-md">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, Math.min(item.product.stock_quantity, item.quantity + 1))}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product_id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">KES {(item.product.price * item.quantity).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-card rounded-xl border border-border p-6 h-fit sticky top-20 space-y-4">
              <h2 className="font-bold text-lg">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="flex justify-between text-secondary"><span>Discount ({appliedCoupon?.code})</span><span>-KES {discount.toLocaleString()}</span></div>}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">KES {total.toLocaleString()}</span></div>
              </div>
              
              {/* Coupon */}
              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <Input placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="uppercase" />
                  <Button variant="outline" onClick={applyCoupon} disabled={applyingCoupon}>Apply</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-secondary/10 p-2 rounded-lg text-sm">
                  <span className="font-medium text-secondary">{appliedCoupon.code} applied</span>
                  <Button variant="ghost" size="sm" onClick={removeCoupon}>Remove</Button>
                </div>
              )}

              <Link to="/checkout" state={{ coupon: appliedCoupon, discount }}>
                <Button className="w-full gap-2" size="lg"><span>Checkout</span><ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
