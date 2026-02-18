import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Heart, Minus, Plus, Leaf, ArrowLeft, FileText, Zap, ClipboardList, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data } = await supabase.from("products").select("*, categories(name)").eq("slug", slug!).maybeSingle();
      setProduct(data);
      setLoading(false);
      if (data && user) {
        const { data: w } = await supabase.from("wishlists").select("id").eq("user_id", user.id).eq("product_id", data.id).maybeSingle();
        setWishlisted(!!w);
      }
    };
    if (slug) fetchProduct();
  }, [slug, user]);

  const toggleWishlist = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (wishlisted) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", product.id);
      setWishlisted(false);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, product_id: product.id });
      setWishlisted(true);
      toast.success("Added to wishlist");
    }
  };

  const handleDownloadPdf = async () => {
    if (!product?.safety_sheet_url) return;
    setDownloadingPdf(true);
    try {
      const { data, error } = await supabase.storage
        .from("product-pdfs")
        .createSignedUrl(product.safety_sheet_url, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Failed to download safety sheet");
    }
    setDownloadingPdf(false);
  };

  const handleBuyNow = async () => {
    if (!user) { toast.error("Please sign in to proceed"); return; }
    await addToCart(product.id, quantity);
    navigate("/checkout");
  };

  if (loading) return <Layout><div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></Layout>;
  if (!product) return <Layout><div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-4">Product not found</h1><Link to="/products"><Button>Back to Products</Button></Link></div></Layout>;

  const images = product.images?.length ? product.images : ["/placeholder.svg"];
  const inStock = product.stock_quantity > 0;

  return (
    <Layout>
      <SEO
        title={product.name}
        description={product.short_description}
        url={`https://www.becoforganicchemicals.com/products/${product.slug}`}
        image={images[0]}
      />

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          name: product.name,
          image: images.map((img: string) =>
            img.startsWith("http")
              ? img
              : `https://www.becoforganicchemicals.com${img}`
          ),
          description: product.short_description,
          sku: product.sku,
          brand: {
            "@type": "Brand",
            name: "Becof Organic Chemicals",
          },
          offers: {
            "@type": "Offer",
            url: `https://www.becoforganicchemicals.com/products/${product.slug}`,
            priceCurrency: "KES",
            price: product.price,
            availability:
              product.stock_quantity > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        })}
      </script>

      <section className="py-8">
        <div className="container">
          <Link to="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Images */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-3">
                <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img: string, i: number) => (
                    <button key={i} onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === selectedImage ? "border-primary" : "border-transparent"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Details */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              {product.categories?.name && <Badge variant="secondary">{product.categories.name}</Badge>}
              <h1 className="text-3xl font-bold">{product.name}</h1>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-earth text-earth" />
                  <span className="font-medium">{product.average_rating || 0}</span>
                  <span className="text-sm text-muted-foreground">({product.review_count || 0} reviews)</span>
                </div>
                {product.environmental_rating && (
                  <div className="flex items-center gap-1 text-sm text-secondary">
                    <Leaf className="h-4 w-4" /> Eco Score: {product.environmental_rating}/5
                  </div>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">KES {product.price.toLocaleString()}</span>
                {product.compare_at_price && (
                  <span className="text-lg text-muted-foreground line-through">KES {product.compare_at_price.toLocaleString()}</span>
                )}
              </div>

              <p className="text-muted-foreground">{product.short_description}</p>

              <div className="flex items-center gap-2">
                <Badge variant={inStock ? "default" : "destructive"}>
                  {inStock ? `${product.stock_quantity} in stock` : "Out of Stock"}
                </Badge>
                {product.sku && <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>}
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-3 pt-2">
                {inStock && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-border rounded-lg">
                      <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-4 w-4" /></Button>
                      <span className="w-12 text-center font-medium">{quantity}</span>
                      <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <Button className="flex-1 gap-2" size="lg" onClick={() => addToCart(product.id, quantity)}>
                      <ShoppingCart className="h-4 w-4" /> Add to Cart
                    </Button>
                    <Button variant="outline" size="icon" onClick={toggleWishlist} className={wishlisted ? "text-destructive border-destructive" : ""}>
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                )}

                {inStock ? (
                  <Button className="w-full gap-2" size="lg" variant="secondary" onClick={handleBuyNow}>
                    <Zap className="h-4 w-4" /> Buy Now
                  </Button>
                ) : (
                  <Button className="w-full gap-2" size="lg" onClick={() => navigate("/contact")}>
                    <ClipboardList className="h-4 w-4" /> Make an Order
                  </Button>
                )}
              </div>

              {product.safety_sheet_url && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-2 text-sm text-accent hover:underline disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Download Safety Sheet (PDF)
                </button>
              )}

              {product.long_description && (
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{product.long_description}</p>
                </div>
              )}

              {product.usage_instructions && (
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold mb-2">Usage Instructions</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{product.usage_instructions}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
