// Build-time server renderer, used only by scripts/prerender.mjs (built with
// `vite build --ssr`). Renders each public page to HTML with its Supabase data
// already loaded, so crawlers, AI bots and link previews get real content
// instead of an empty <div id="root">.

import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { JSDOM } from "jsdom";
import type { WindowLike } from "dompurify";
import App from "./App";
import { setPrerenderStore } from "@/lib/prerenderData";
import { setSanitizerWindow } from "@/lib/sanitize";
import {
  fetchFeaturedProducts, fetchFeaturedPartners, fetchPublishedProducts, fetchProductBySlug,
  fetchProductReviews, fetchLearnIndex, fetchArticleBySlug, fetchImpactData,
  fetchPartnerProfiles, fetchJobPositions,
} from "@/lib/publicData";

setSanitizerWindow(new JSDOM("").window as unknown as WindowLike);

// Every published product and article, for the route list, sitemap, llms.txt
// and product feed.
export const loadSiteData = async () => {
  const [{ products, categories }, { articles, categories: learnCategories }] = await Promise.all([
    fetchPublishedProducts(),
    fetchLearnIndex(),
  ]);
  return { products, categories, articles, learnCategories };
};

// Data each public route needs for its first render, keyed as the pages read
// it with getPrerendered(). Returns null when a product/article doesn't exist.
export const loadRouteData = async (path: string): Promise<Record<string, unknown> | null> => {
  const product = path.match(/^\/products\/([^/]+)$/);
  if (product) {
    const data = await fetchProductBySlug(product[1]);
    if (!data) return null;
    // Reviews are a nice-to-have — don't lose the whole product page over them
    const reviews = await fetchProductReviews(data.id).catch(() => []);
    // Review photos live in a private bucket and need a short-lived signed
    // link, which the browser fetches itself — don't bake in a broken path.
    const safeReviews = reviews.map((r) =>
      r.image_url && !r.image_url.startsWith("http") ? { ...r, image_url: null } : r
    );
    return { [`product:${product[1]}`]: { product: data, reviews: safeReviews } };
  }

  const article = path.match(/^\/learn\/([^/]+)$/);
  if (article) {
    const data = await fetchArticleBySlug(article[1]);
    return data ? { [`article:${article[1]}`]: data } : null;
  }

  switch (path) {
    case "/": {
      const [featuredProducts, featuredPartners] = await Promise.all([
        fetchFeaturedProducts(),
        fetchFeaturedPartners(),
      ]);
      return { featuredProducts, featuredPartners };
    }
    case "/products":
      return { products: await fetchPublishedProducts() };
    case "/learn":
      return { learn: await fetchLearnIndex() };
    case "/impact":
      return { impact: await fetchImpactData() };
    case "/partners":
      return { partnerProfiles: await fetchPartnerProfiles() };
    case "/careers":
      return { jobPositions: await fetchJobPositions() };
    default:
      return {};
  }
};

export const render = (path: string, data: Record<string, unknown>) => {
  setPrerenderStore(data);
  const helmetContext: { helmet?: HelmetServerState } = {};
  const Router = ({ children }: { children: React.ReactNode }) => (
    <StaticRouter location={path}>{children}</StaticRouter>
  );
  try {
    const html = renderToString(
      <HelmetProvider context={helmetContext}>
        <App Router={Router} />
      </HelmetProvider>
    );
    return { html, helmet: helmetContext.helmet };
  } finally {
    setPrerenderStore(null);
  }
};
