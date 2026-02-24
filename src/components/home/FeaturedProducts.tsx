import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ArrowRight, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  average_rating: number | null;
  short_description: string | null;
  images: string[] | null;
  slug: string;
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, price, average_rating, short_description, images, slug")
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("average_rating", { ascending: false, nullsFirst: false })
        .limit(12);

      if (!error && data) setProducts(data);
      setLoading(false);
    };

    fetchFeatured();
  }, []);

  const handleAddToCart = async (productId: string) => {
    setAddingId(productId);
    await addToCart(productId, 1);
    setAddingId(null);
  };

  const formatPrice = (price: number) => `KES ${price.toLocaleString("en-KE")}`;

  return (
    <section className="py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14"
        >
          <div>
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-secondary bg-secondary/10 rounded-full mb-3">
              Top Picks
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Products</h2>
            <p className="text-muted-foreground">Our most trusted solutions for sustainable farming</p>
          </div>
          <Link to="/products" className="hidden sm:block">
            <Button variant="outline" className="gap-2 shrink-0">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-5 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                  <div className="flex justify-between pt-2">
                    <div className="h-5 w-20 bg-muted rounded" />
                    <div className="h-8 w-20 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No featured products available at the moment.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((p, i) => {
              const coverImage = p.images?.[0] ?? null;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col"
                >
                  <Link to={`/products/${p.slug}`}>
                    <div className="relative h-48 bg-gradient-to-br from-primary/8 to-secondary/8 overflow-hidden flex items-center justify-center">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center">
                          <span className="text-3xl">🌿</span>
                        </div>
                      )}
                      {p.average_rating !== null && p.average_rating >= 4.8 && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold tracking-wider uppercase bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                          Top Rated
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-xs font-semibold text-accent uppercase tracking-wide">{p.category}</span>
                    <Link to={`/products/${p.slug}`}>
                      <h3 className="font-semibold text-base mt-1 mb-1 hover:text-primary transition-colors line-clamp-1">{p.name}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1 leading-relaxed">{p.short_description}</p>

                    {p.average_rating !== null && (
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${s <= Math.round(p.average_rating!) ? "fill-earth text-earth" : "text-muted-foreground/30"}`}
                          />
                        ))}
                        <span className="text-xs font-medium text-muted-foreground ml-1">{p.average_rating.toFixed(1)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                      <span className="font-bold text-primary">{formatPrice(p.price)}</span>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={addingId === p.id}
                        onClick={() => handleAddToCart(p.id)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {addingId === p.id ? "Adding…" : "Add"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10 sm:hidden">
          <Link to="/products">
            <Button variant="outline" className="gap-2">View All Products <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
