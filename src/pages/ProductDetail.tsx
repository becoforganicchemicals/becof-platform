import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { fetchProductBySlug, fetchProductReviews } from "@/lib/publicData";
import { getPrerendered } from "@/lib/prerenderData";
import { productSchema, breadcrumbSchema, SITE_URL } from "@/lib/structuredData";
import { DELIVERY_SUMMARY, formatKes } from "@/lib/delivery";
import { formatSize, isPackInStock, maxPacks, pricePerUnit, sortPacks, unitOf, type PackSize } from "@/lib/packs";
import { programmesForProduct } from "@/lib/cropProgrammes";
import PackCalculator from "@/components/product/PackCalculator";
import { PRODUCT_BADGES } from "@/lib/productBadges";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Heart, Minus, Plus, Leaf, ArrowLeft, FileText, Zap, ClipboardList, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import WhatsAppOrderButton from "@/components/WhatsAppOrderButton";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, amountInCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const seed = getPrerendered<{ product: any; reviews: any[] }>(`product:${slug}`);
  const [product, setProduct] = useState<any>(() => seed?.product ?? null);
  const [loading, setLoading] = useState(() => !seed);
  // A failed request is not "not found" — never noindex a page over a network error.
  const [loadFailed, setLoadFailed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reviews, setReviews] = useState<any[]>(() => seed?.reviews ?? []);

  useEffect(() => {
    const fetchProduct = async () => {
      // Reset per-product UI state up front — otherwise navigating from one
      // product to another (same route, so this component instance persists)
      // can leave a stale selectedImage index pointing past the new
      // product's image count (broken image), or a quantity left over from
      // the previous product that hasn't been clamped to its stock yet.
      // Skipped when this product is already showing (pre-rendered first load,
      // or a refetch after sign-in), so its content doesn't flash out.
      if (product?.slug !== slug) {
        setLoading(true);
        setQuantity(1);
        setSelectedImage(0);
        setWishlisted(false);
        setReviews([]);
      }
      setLoadFailed(false);
      let data;
      try {
        data = await fetchProductBySlug(slug!);
      } catch {
        // Keep the product if it's already showing (pre-rendered) — see publicData.ts
        if (product?.slug !== slug) setLoadFailed(true);
        setLoading(false);
        return;
      }
      setProduct(data);
      setLoading(false);
      if (data && user) {
        const { data: w } = await supabase.from("wishlists").select("id").eq("user_id", user.id).eq("product_id", data.id).maybeSingle();
        setWishlisted(!!w);
      }
      if (data) {
        // review-images is a private bucket: image_url holds the object path,
        // so signed-in visitors get a short-lived signed link for each photo.
        let rows: any[];
        try {
          rows = await fetchProductReviews(data.id);
        } catch {
          return; // keep the reviews already showing
        }
        const withPhotos = await Promise.all(
          rows.map(async (row: any) => {
            if (!row.image_url || row.image_url.startsWith("http")) return row;
            const { data: signed } = await supabase.storage
              .from("review-images")
              .createSignedUrl(row.image_url, 3600);
            return { ...row, image_url: signed?.signedUrl || null };
          })
        );
        setReviews(withPhotos);
      }
    };
    if (slug) fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : product?.average_rating || 0;

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

  // Pack sizes, smallest first, in the product's unit (L, kg or g). Products
  // without any fall back to a single 1-unit pack at the listed price.
  const unit = unitOf(product?.unit);
  const packs: PackSize[] = product
    ? sortPacks(product.product_variants).length
      ? sortPacks(product.product_variants)
      : [{ id: "", size_liters: 1, price: product.price, sku: product.sku }]
    : [];
  // The selected size lives in the URL (?size=5) so each size has its own
  // link for sharing, Google Shopping and the structured data.
  const requestedSize = Number(searchParams.get("size"));
  const selectedPack =
    packs.find((p) => p.size_liters === requestedSize) ??
    packs.find((p) => product && isPackInStock(p, product.stock_quantity)) ??
    packs[0];
  const selectPack = (pack: PackSize) => {
    setQuantity(1);
    setSelectedImage(0); // show the chosen pack's own image, if it has one
    setSearchParams(pack === packs[0] ? {} : { size: String(pack.size_liters) }, { replace: true });
  };
  const maxQuantity = product && selectedPack
    ? Math.max(1, maxPacks(selectedPack, product.stock_quantity, amountInCart(product.id)))
    : 1;

  const handleAddToCart = () => addToCart(product.id, quantity, selectedPack?.id || undefined);

  const handleBuyNow = async () => {
    if (!user) { toast.error("Please sign in to proceed"); return; }
    await addToCart(product.id, quantity, selectedPack?.id || undefined);
    navigate("/checkout");
  };

  if (loading) return <Layout><div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div></Layout>;
  if (loadFailed && !product) return <Layout><div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-2">We couldn't load this product</h1><p className="text-muted-foreground mb-6">Please check your connection and try again.</p><Button onClick={() => window.location.reload()}>Try again</Button></div></Layout>;
  if (!product) return <Layout><SEO title="Product not found" description="This product could not be found." url={`https://www.becoforganicchemicals.com/products/${slug}`} noindex /><div className="container py-20 text-center"><h1 className="text-2xl font-bold mb-4">Product not found</h1><Link to="/products"><Button>Back to Products</Button></Link></div></Layout>;

  const productImages: string[] = product.images?.length ? product.images : ["/placeholder.svg"];
  // The selected pack's own image (e.g. the 5 kg pouch) leads the gallery
  const images = selectedPack?.image_url
    ? [selectedPack.image_url, ...productImages.filter((img) => img !== selectedPack.image_url)]
    : productImages;
  const inStock = product.stock_quantity > 0;
  const packInStock = isPackInStock(selectedPack, product.stock_quantity);
  // Exact stock isn't useful to shoppers (and is in grams for some products):
  // say "In stock", or how many of the selected pack are left when it's low.
  const packsLeft = maxPacks(selectedPack, product.stock_quantity);
  const recommendedFor = programmesForProduct(product.slug);

  const productUrl = `${SITE_URL}/products/${product.slug}`;
  const whatsappMessage = inStock
    ? `Hi Becof Organic Chemicals! I'd like to order:\n\n*${product.name}*\nPack size: ${formatSize(selectedPack.size_liters, unit)}\nQuantity: ${quantity}\nEstimated total: KES ${(selectedPack.price * quantity).toLocaleString()}\n\nProduct link: ${productUrl}\n\nCould you help me place this order?`
    : `Hi Becof Organic Chemicals! I'm interested in *${product.name}*, currently shown as out of stock on your website.\n\nProduct link: ${productUrl}\n\nCould you let me know when it'll be back, or help me arrange a custom order?`;

  return (
    <Layout>
      <SEO
        title={product.name}
        description={product.short_description}
        url={productUrl}
        image={productImages[0]}
        type="product"
        jsonLd={[
          productSchema(product, productImages, reviews, packs),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        ]}
      />



      <section className="py-8">
        <div className="container">
          <Link to="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Images */}
            {/* min-w-0: grid columns otherwise refuse to shrink below their
                widest content, which pushed the page wider than phone screens */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="min-w-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted mb-3">
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
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5 min-w-0">
              {product.categories?.name && <Badge variant="secondary">{product.categories.name}</Badge>}
              <h1 className="text-3xl font-bold">{product.name}</h1>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-earth text-earth" />
                  <span className="font-medium">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({reviews.length} review{reviews.length === 1 ? "" : "s"})</span>
                </div>
              </div>

              {(PRODUCT_BADGES[product.slug] ?? []).length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Product highlights">
                  {PRODUCT_BADGES[product.slug].map((badge) => (
                    <li key={badge} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Leaf className="h-3.5 w-3.5" /> {badge}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold text-primary">{formatKes(selectedPack.price)}</span>
                <span className="text-sm text-muted-foreground">
                  {formatSize(selectedPack.size_liters, unit)}
                  {packs.length > 1 && <> · {formatKes(pricePerUnit(selectedPack))} per {unit}</>}
                </span>
                {product.compare_at_price && selectedPack.size_liters === 1 && (
                  <span className="text-lg text-muted-foreground line-through">KES {product.compare_at_price.toLocaleString()}</span>
                )}
              </div>

              {packs.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pack size</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pack size">
                    {packs.map((pack) => {
                      const available = isPackInStock(pack, product.stock_quantity);
                      const active = pack.id === selectedPack.id;
                      return (
                        <button
                          key={pack.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={!available}
                          onClick={() => selectPack(pack)}
                          className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="block text-sm font-semibold">{formatSize(pack.size_liters, unit)}</span>
                          <span className="block text-xs text-muted-foreground">
                            {available ? formatKes(pack.price) : "Out of stock"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-muted-foreground">{product.short_description}</p>

              <div className="flex items-center gap-2">
                <Badge variant={inStock ? "default" : "destructive"}>
                  {!inStock ? "Out of Stock" : packInStock && packsLeft < 10 ? `Only ${packsLeft} left` : "In stock"}
                </Badge>
                {(selectedPack.sku || product.sku) && (
                  <span className="text-xs text-muted-foreground">SKU: {selectedPack.sku || product.sku}</span>
                )}
              </div>

              <p className="text-sm text-muted-foreground">📦 {DELIVERY_SUMMARY}</p>

              {/* Quantity & Actions */}
              <div className="space-y-3 pt-2">
                {packInStock && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-border rounded-lg">
                      <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus className="h-4 w-4" /></Button>
                      <span className="w-12 text-center font-medium">{quantity}</span>
                      <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <Button className="flex-1 gap-2" size="lg" onClick={handleAddToCart}>
                      <ShoppingCart className="h-4 w-4" /> Add to Cart
                    </Button>
                    <Button variant="outline" size="icon" onClick={toggleWishlist} className={wishlisted ? "text-destructive border-destructive" : ""}>
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                )}

                {packInStock ? (
                  <Button className="w-full gap-2" size="lg" variant="secondary" onClick={handleBuyNow}>
                    <Zap className="h-4 w-4" /> Buy Now
                  </Button>
                ) : (
                  <Button className="w-full gap-2" size="lg" onClick={() => navigate("/custom-order", { state: { productName: product.name, productId: product.id } })}>
                    <ClipboardList className="h-4 w-4" /> Make an Order
                  </Button>
                )}

                <WhatsAppOrderButton message={whatsappMessage} label="Order via WhatsApp" />
              </div>

              {inStock && <PackCalculator product={product} packs={packs.filter((p) => p.id)} />}

              {recommendedFor.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Recommended for: </span>
                  {recommendedFor.map(({ crop }, i) => (
                    <span key={crop.slug}>
                      {i > 0 && ", "}
                      <Link to={`/crops/${crop.slug}`} className="text-primary hover:underline">{crop.name}</Link>
                    </span>
                  ))}
                </div>
              )}

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

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border max-w-3xl">
              <h2 className="font-semibold text-lg mb-4">Customer Reviews ({reviews.length})</h2>
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-earth text-earth" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      {r.is_verified_purchase && (
                        <Badge variant="secondary" className="text-[10px]">Verified Purchase</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(r.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    {r.image_url && (
                      <img src={r.image_url} alt="Review" className="mt-2 h-24 w-24 object-cover rounded-lg border border-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
