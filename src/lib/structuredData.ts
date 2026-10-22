// schema.org JSON-LD builders, passed to <SEO jsonLd={...} />. Every page's
// schema points back at the one Organization by @id, so search engines and AI
// assistants connect products and articles to the same business entity.

export const SITE_URL = "https://www.becoforganicchemicals.com";
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Becof Organic Chemicals Limited",
  alternateName: "Becof",
  url: SITE_URL,
  logo: `${SITE_URL}/images/becof-logo.png`,
  description:
    "Kenyan agri-biotechnology company making microbial biofertilizers, biopesticides and organic soil amendments for farmers across Kenya and beyond.",
  foundingDate: "2024-11-20",
  founder: [
    {
      "@type": "Person",
      name: "Benjamin Baya",
      jobTitle: "Co-Founder & Chief Executive Officer",
      url: "https://benjaminbaya.com",
      image: `${SITE_URL}/images/benjamin-baya.jpg`,
    },
    {
      "@type": "Person",
      name: "Andrew Omwenga",
      jobTitle: "Co-Founder & Chief Operating Officer",
      image: `${SITE_URL}/images/andrew-omwenga.jpeg`,
    },
  ],
  email: "info@becoforganic.com",
  telephone: "+254735283397",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Nairobi",
    addressCountry: "KE",
  },
  areaServed: { "@type": "Country", name: "Kenya" },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: "+254735283397",
    email: "info@becoforganic.com",
    areaServed: "KE",
    availableLanguage: ["English", "Swahili"],
    hoursAvailable: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  },
  // Terms of Service §6: no returns (live microbial products); damaged, wrong
  // or expired-on-arrival items are replaced or refunded if reported within
  // 72 hours. Google treats that as a guarantee, not a return policy.
  hasMerchantReturnPolicy: {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "KE",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    merchantReturnLink: `${SITE_URL}/legal/terms#returns`,
  },
  sameAs: [
    "https://www.facebook.com/becoforganicchemicals",
    "https://www.instagram.com/becoforganicchemicals",
    "https://www.linkedin.com/company/becof-organic-chemicals",
    "https://www.tiktok.com/@becoforganicchemicals",
    "https://www.youtube.com/@becoforganicchemicals",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "Becof Organic Chemicals",
  url: SITE_URL,
  publisher: { "@id": ORG_ID },
  inLanguage: "en-KE",
};

export const breadcrumbSchema = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: absolute(item.path),
  })),
});

interface ProductLike {
  name: string;
  slug: string;
  sku?: string | null;
  price: number;
  stock_quantity: number;
  short_description?: string | null;
  long_description?: string | null;
  categories?: { name: string } | null;
}

interface ReviewLike {
  rating: number;
}

export const productSchema = (product: ProductLike, images: string[], reviews: ReviewLike[]) => {
  const url = `${SITE_URL}/products/${product.slug}`;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
    image: images.map(absolute),
    description: product.short_description || product.long_description || undefined,
    sku: product.sku || undefined,
    category: product.categories?.name,
    brand: { "@type": "Brand", name: "Becof Organic Chemicals" },
    manufacturer: { "@id": ORG_ID },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "KES",
      price: product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": ORG_ID },
      hasMerchantReturnPolicy: organizationSchema.hasMerchantReturnPolicy,
    },
    // Google requires this to reflect genuine reviews — omit entirely
    // rather than show a 0.0/0-reviews rating for an unreviewed product.
    ...(reviews.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avg.toFixed(1),
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
};

interface ArticleLike {
  title: string;
  slug: string;
  excerpt?: string;
  meta_description?: string;
  author?: string;
  created_at: string;
  updated_at?: string;
  featured_image?: string | null;
  tags?: string[] | null;
}

export const articleSchema = (article: ArticleLike, categoryName?: string) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${SITE_URL}/learn/${article.slug}#article`,
  headline: article.title,
  description: article.meta_description || article.excerpt || undefined,
  url: `${SITE_URL}/learn/${article.slug}`,
  mainEntityOfPage: `${SITE_URL}/learn/${article.slug}`,
  image: article.featured_image ? absolute(article.featured_image) : `${SITE_URL}/default-og-image.png`,
  keywords: article.tags?.length ? article.tags.join(", ") : undefined,
  datePublished: article.created_at,
  dateModified: article.updated_at || article.created_at,
  articleSection: categoryName,
  author: article.author
    ? { "@type": "Person", name: article.author }
    : { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
  inLanguage: "en-KE",
});
