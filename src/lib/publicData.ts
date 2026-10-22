// Queries behind the public, indexable pages. Shared by the pages themselves
// and by the build-time prerender (src/entry-server.tsx), so the content baked
// into the pre-rendered HTML is exactly what the page would fetch in a browser.

import { supabase } from "@/integrations/supabase/client";

export const fetchFeaturedProducts = async () => {
  const { data } = await supabase
    .from("products")
    .select("id, name, price, average_rating, short_description, images, slug, stock_quantity, categories(name)")
    .eq("is_featured", true)
    .eq("is_published", true)
    .order("average_rating", { ascending: false, nullsFirst: false })
    .limit(12);
  return data || [];
};

export const fetchFeaturedPartners = async () => {
  const { data } = await supabase
    .from("partner_profiles")
    .select("id, display_name, tagline, logo_url")
    .eq("published", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(8);
  return data || [];
};

export const fetchPublishedProducts = async () => {
  const [prodRes, catRes] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories (id, name, parent_id)")
      .eq("is_published", true),
    supabase.from("categories").select("id, name, slug, parent_id"),
  ]);
  return { products: prodRes.data || [], categories: catRes.data || [] };
};

export const fetchProductBySlug = async (slug: string) => {
  const { data } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("slug", slug)
    .maybeSingle();
  return data;
};

export const fetchProductReviews = async (productId: string) => {
  const { data } = await supabase
    .from("product_reviews")
    .select("id, rating, comment, image_url, is_verified_purchase, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  return data || [];
};

export const fetchLearnIndex = async () => {
  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase.from("learn_categories").select("*"),
    supabase
      .from("learn_articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false }),
  ]);
  return { categories: categories || [], articles: articles || [] };
};

export const fetchArticleBySlug = async (slug: string) => {
  const { data: article } = await supabase
    .from("learn_articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!article) return null;

  const [{ data: category }, { data: related }] = await Promise.all([
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
  return { article, category: category || null, related: related || [] };
};

export const fetchImpactData = async () => {
  const [{ data: metrics }, { data: reports }, { data: awards }] = await Promise.all([
    supabase.from("impact_metrics").select("*").order("sort_order"),
    supabase.from("esg_reports").select("*").eq("published", true).order("year", { ascending: false }),
    supabase.from("impact_awards").select("*").order("awarded_date", { ascending: false }),
  ]);
  return { metrics: metrics || [], reports: reports || [], awards: awards || [] };
};

export const fetchPartnerProfiles = async () => {
  const { data } = await supabase
    .from("partner_profiles")
    .select("*")
    .eq("published", true)
    .order("featured", { ascending: false });
  return data || [];
};

export const fetchJobPositions = async () => {
  const { data, error } = await supabase
    .from("job_positions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};
