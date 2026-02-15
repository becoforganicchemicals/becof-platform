import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Wishlist = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("wishlists").select("id, product_id, products(id, name, slug, price, images, stock_quantity, average_rating, short_description)").eq("user_id", user.id);
    setItems(data?.map((d: any) => ({ ...d, product: d.products })) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user]);

  const remove = async (productId: string) => {
    if (!user) return;
    await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
    toast.success("Removed from wishlist");
    fetch();
  };

  if (!user) return <Layout><div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-4">Sign in to view your wishlist</h1><Link to="/signin"><Button>Sign In</Button></Link></div></Layout>;

  return (
    <Layout>
      <section className="py-10">
        <div className="container">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2"><Heart className="h-7 w-7 text-destructive" /> My Wishlist</h1>
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
              <Link to="/products"><Button>Browse Products</Button></Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all">
                  <Link to={`/products/${item.product.slug}`} className="block h-44 bg-muted">
                    <img src={item.product.images?.[0] || "/placeholder.svg"} alt={item.product.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="p-4">
                    <Link to={`/products/${item.product.slug}`} className="font-semibold hover:text-primary">{item.product.name}</Link>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.product.short_description}</p>
                    <p className="font-bold text-primary mt-2">KES {item.product.price.toLocaleString()}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1 gap-1" disabled={item.product.stock_quantity === 0} onClick={() => addToCart(item.product.id)}>
                        <ShoppingCart className="h-3.5 w-3.5" /> Add
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive" onClick={() => remove(item.product_id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Wishlist;
