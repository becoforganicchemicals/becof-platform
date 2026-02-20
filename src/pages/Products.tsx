import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, ShoppingCart, Search, Heart, Zap, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const Products = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeParent, setActiveParent] = useState<string>("all");
  const [activeSub, setActiveSub] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");
  const parentCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id);

  const visibleSubCategories =
    activeParent === "all"
      ? []
      : subCategories.filter(s => s.parent_id === activeParent);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from("products")
          .select(`
            *,
            categories (
              id,
              name,
              parent_id
            )
         `)
          .eq("is_published", true),
        supabase
          .from("categories")
          .select("id, name, slug, parent_id")
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setLoading(false);

      if (user) {
        const { data: wl } = await supabase.from("wishlists").select("product_id").eq("user_id", user.id);
        setWishlistedIds(new Set(wl?.map(w => w.product_id) || []));
      }
    };
    fetchData();
  }, [user]);

  const toggleWishlist = async (productId: string) => {
    if (!user) { toast.error("Please sign in"); return; }
    if (wishlistedIds.has(productId)) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
      setWishlistedIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
      setWishlistedIds(prev => new Set(prev).add(productId));
      toast.success("Added to wishlist");
    }
  };

  const handleBuyNow = async (product: any) => {
    if (!user) { toast.error("Please sign in to proceed"); return; }
    await addToCart(product.id, 1);
    navigate("/checkout");
  };

  let filtered = products
    // Parent filter
    .filter(p => {
      if (activeParent === "all") return true;

      // Direct category match
      if (p.category_id === activeParent) return true;

      // Subcategory under selected parent
      if (p.categories?.parent_id === activeParent) return true;

      return false;
    })
    // Subcategory filter (only if selected)
    .filter(p => {
      if (activeSub === "all") return true;
      return p.category_id === activeSub;
    })
    // Search filter
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
    // Stock filter
    .filter(p => {
      const qty = p.stock_quantity ?? 0;

      if (stockFilter === "all") return true;
      if (stockFilter === "in") return qty > 0;
      if (stockFilter === "out") return qty <= 0;

      return true;
    });

  if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));



  return (
    <Layout>
      <SEO
        title="Products"
        description="Explore our range of sustainable organic chemical products designed for agriculture."
        url="https://www.becoforganicchemicals.com/products"
      />
      <section className="py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="text-4xl font-bold mb-2">Our Products</h1>
            <p className="text-muted-foreground">Explore our range of sustainable organic chemical products designed for agriculture.</p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="border border-border rounded-lg px-4 py-2 bg-card text-sm" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="popular">Popularity</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <select
              className="border border-border rounded-lg px-4 py-2 bg-card text-sm"
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value as any)}
            >
              <option value="all">All Stock</option>
              <option value="in">In Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          {/* Parent Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={activeParent === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveParent("all");
                setActiveSub("all");
              }}
            >
              All
            </Button>

            {parentCategories.map(c => (
              <Button
                key={c.id}
                variant={activeParent === c.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveParent(c.id);
                  setActiveSub("all");
                }}
              >
                {c.name}
              </Button>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            Subcategories
          </p>

          {/* Subcategories (ALWAYS below parents) */}
          {activeParent !== "all" && visibleSubCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <Button
                variant={activeSub === "all" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setActiveSub("all")}
              >
                All
              </Button>

              {visibleSubCategories.map(s => (
                <Button
                  key={s.id}
                  variant={activeSub === s.id ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setActiveSub(s.id)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No products found.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((p, i) => {
                const inStock = p.stock_quantity > 0;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all group">
                    <Link to={`/products/${p.slug}`} className="block h-44 bg-muted relative overflow-hidden">
                      <img src={p.images?.[0] || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {!inStock && (
                        <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">Out of Stock</span>
                      )}
                    </Link>
                    <div className="p-5">
                      <span className="text-xs font-medium text-accent">{p.categories?.name}</span>
                      <Link to={`/products/${p.slug}`}><h3 className="font-semibold text-lg mt-1 mb-1 hover:text-primary">{p.name}</h3></Link>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.short_description}</p>
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="h-3.5 w-3.5 fill-earth text-earth" />
                        <span className="text-sm font-medium">{p.average_rating || 0}</span>
                        <span className="text-xs text-muted-foreground">({p.review_count || 0})</span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-bold text-primary">KES {p.price.toLocaleString()}</span>
                          {p.compare_at_price && <span className="text-xs text-muted-foreground line-through ml-2">KES {p.compare_at_price.toLocaleString()}</span>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleWishlist(p.id)}>
                            <Heart className={`h-3.5 w-3.5 ${wishlistedIds.has(p.id) ? "fill-destructive text-destructive" : ""}`} />
                          </Button>
                          {inStock && (
                            <Button size="sm" className="gap-1" onClick={() => addToCart(p.id)}>
                              <ShoppingCart className="h-3.5 w-3.5" /> Add
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Buy Now / Make an Order */}
                      {inStock ? (
                        <Button size="sm" variant="secondary" className="w-full gap-1" onClick={() => handleBuyNow(p)}>
                          <Zap className="h-3.5 w-3.5" /> Buy Now
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => navigate("/contact")}>
                          <ClipboardList className="h-3.5 w-3.5" /> Make an Order
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Products;
