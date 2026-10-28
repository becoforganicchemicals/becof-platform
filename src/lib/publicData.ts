// Queries behind the public, indexable pages. Shared by the pages themselves
// and by the build-time prerender (src/entry-server.tsx), so the content baked
// into the pre-rendered HTML is exactly what the page would fetch in a browser.
//
// Every query THROWS on failure rather than returning an empty list. Pages
// start with pre-rendered content and refresh it; if a refresh fails (as it
// did in Google's renderer), they must keep what they're showing — replacing
// it with [] made Google see "No products found" and flag a soft 404.

import { supabase } from "@/integrations/supabase/client";

// Active pack sizes (RLS hides inactive ones from the public)
const PACKS = "product_variants (id, size_liters, price, sku, is_active, image_url)";

const must = <T>({ data, error }: { data: T; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message);
  return data;
};

export const fetchFeaturedProducts = async () => {
  const data = must(await supabase
    .from("products")
    .select(`id, name, price, average_rating, short_description, images, slug, stock_quantity, unit, categories(name), ${PACKS}`)
    .eq("is_featured", true)
    .eq("is_published", true)
    .order("average_rating", { ascending: false, nullsFirst: false })
    .limit(12));
  return data || [];
};

export const fetchFeaturedPartners = async () => {
  const data = must(await supabase
    .from("partner_profiles")
    .select("id, display_name, tagline, logo_url")
    .eq("published", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(8));
  return data || [];
};

export const fetchPublishedProducts = async () => {
  const [prodRes, catRes] = await Promise.all([
    supabase
      .from("products")
      .select(`*, categories (id, name, parent_id), ${PACKS}`)
      .eq("is_published", true),
    supabase.from("categories").select("id, name, slug, parent_id"),
  ]);
  return { products: must(prodRes) || [], categories: must(catRes) || [] };
};

// null only when the product genuinely doesn't exist
export const fetchProductBySlug = async (slug: string) =>
  must(await supabase
    .from("products")
    .select(`*, categories(name), ${PACKS}`)
    .eq("slug", slug)
    .maybeSingle());

export const fetchProductReviews = async (productId: string) =>
  must(await supabase
    .from("product_reviews")
    .select("id, rating, comment, image_url, is_verified_purchase, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })) || [];

export const fetchLearnIndex = async () => {
  const [catRes, artRes] = await Promise.all([
    supabase.from("learn_categories").select("*"),
    supabase
      .from("learn_articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false }),
  ]);
  return { categories: must(catRes) || [], articles: must(artRes) || [] };
};

export const fetchArticleBySlug = async (slug: string) => {
  // null only when the article genuinely doesn't exist
  const article = must(await supabase
    .from("learn_articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle());
  if (!article) return null;

  const [catRes, relRes] = await Promise.all([
    supabase.from("learn_categories").select("*").eq("id", article.category_id).maybeSingle(),
    supabase
      .from("learn_articles")
      .select("*")
      .eq("published", true)
      .eq("category_id", article.category_id)
      .neq("id", article.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  return { article, category: must(catRes) || null, related: must(relRes) || [] };
};

export const fetchImpactData = async () => {
  const [metRes, repRes, awdRes] = await Promise.all([
    supabase.from("impact_metrics").select("*").order("sort_order"),
    supabase.from("esg_reports").select("*").eq("published", true).order("year", { ascending: false }),
    supabase.from("impact_awards").select("*").order("awarded_date", { ascending: false }),
  ]);
  return { metrics: must(metRes) || [], reports: must(repRes) || [], awards: must(awdRes) || [] };
};

export const fetchPartnerProfiles = async () =>
  must(await supabase
    .from("partner_profiles")
    .select("*")
    .eq("published", true)
    .order("featured", { ascending: false })) || [];

export const fetchJobPositions = async () =>
  must(await supabase
    .from("job_positions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false }));
