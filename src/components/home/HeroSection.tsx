import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import heroBg from "@/assets/hero-bg.jpg";

interface SpotlightProduct {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  short_description: string | null;
  images: string[] | null;
  slug: string;
}

const HeroSection = () => {
  const [product, setProduct] = useState<SpotlightProduct | null>(null);
  const [adding, setAdding] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, compare_at_price, short_description, images, slug")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) setProduct(data);
    };
    fetchLatest();
  }, []);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    await addToCart(product.id, 1);
    setAdding(false);
  };

  const coverImage = product?.images?.[0] ?? null;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="Sustainable farming" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
      </div>
      <div className="container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-secondary/20 text-primary-foreground border border-primary-foreground/20">
              Driven by People, Rooted in Purpose - We are Saving Lives Through Sustainable Agricultural Solutions.
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
              Transforming Agriculture with{" "}
              <span className="text-secondary">Eco-Friendly</span> Innovation
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed max-w-xl">
              Becof Organic Chemicals delivers cutting-edge biotechnology solutions that protect crops, enrich soils, and safeguard communities - sustainably.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" variant="secondary" className="gap-2 font-semibold">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/partners">
                <Button
                  size="lg"
                  className="gap-2 font-semibold bg-transparent text-white border border-white/70 hover:bg-white/15 hover:border-white transition-all duration-300"
                >
                  <Users className="h-4 w-4" /> Become a Distributor
                </Button>
              </Link>
            </div>
          </motion.div>

          {product && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="flex justify-center lg:justify-end"
            >
              <Link
                to={`/products/${product.slug}`}
                className="group block w-full max-w-[220px] sm:max-w-[260px] bg-card/95 backdrop-blur rounded-3xl border border-white/20 shadow-2xl overflow-hidden hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="flex items-center gap-1.5 px-4 pt-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
                    <Sparkles className="h-3 w-3" /> New Arrival
                  </span>
                </div>

                <div className="relative aspect-[2/3] mx-4 mt-3 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <span className="text-5xl">🌿</span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-heading font-semibold text-base text-foreground mb-1 line-clamp-1">
                    {product.name}
                  </h3>
                  {product.short_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {product.short_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-bold text-primary text-lg">
                        KES {product.price.toLocaleString("en-KE")}
                      </span>
                      {product.compare_at_price && (
                        <span className="text-xs text-muted-foreground line-through">
                          KES {product.compare_at_price.toLocaleString("en-KE")}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs shrink-0"
                      disabled={adding}
                      onClick={(e) => { e.preventDefault(); handleAddToCart(); }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {adding ? "Adding…" : "Add"}
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
