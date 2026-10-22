#!/usr/bin/env node
// Runs after `vite build` (client) and `vite build --ssr` (src/entry-server.tsx).
// Turns the single-page app into real HTML files, one per public URL, so every
// search engine, AI crawler and link preview sees each page's actual title,
// description, structured data and content — not an empty <div id="root">.
//
// Also writes, from the same list of published products and articles:
//   404.html            real 404 status for unknown URLs (see vercel.json)
//   app-shell.html      bare SPA shell for signed-in pages and new slugs
//   sitemap.xml         every pre-rendered URL, with product images
//   llms.txt            AI-assistant index of the site (llmstxt.org)
//   llms-full.txt       full product and article text for AI assistants
//   merchant-feed.xml   Google Merchant Center product feed
// and, on production builds, notifies Bing/Yandex/etc. of changed URLs via IndexNow.
//
// Supabase being unreachable never fails the build: pages are still written,
// just without their database content. A page that throws while rendering
// does fail it, since that's a code bug and would otherwise ship silently.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SSR_DIST = join(ROOT, "dist-ssr");
const SITE_URL = "https://www.becoforganicchemicals.com";
const INDEXNOW_KEY = "16cd8a89685b5d286fbff8d6477d8485";

// Public, indexable pages. Signed-in and transactional pages (cart, checkout,
// profile, admin, …) are served the bare app shell instead — see vercel.json.
const STATIC_ROUTES = [
  "/", "/products", "/learn", "/impact", "/about", "/partners", "/affiliates",
  "/contact", "/careers", "/legal/privacy", "/legal/terms", "/legal/cookies",
  "/legal/accessibility",
];

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const stripHtml = (html) =>
  String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>|<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim();

const absolute = (path) => (String(path).startsWith("http") ? path : `${SITE_URL}${path}`);
const fileFor = (route) => join(DIST, route === "/" ? "index.html" : `${route.slice(1)}.html`);
const write = (file, contents) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
};

// ── HTML assembly ────────────────────────────────────────────────────────────
const template = readFileSync(join(DIST, "index.html"), "utf8");
// The bare SPA, before index.html is overwritten with the pre-rendered homepage.
write(join(DIST, "app-shell.html"), template);

const assemble = (route, { html, helmet }, data) => {
  const head = helmet
    ? [helmet.title, helmet.meta, helmet.link, helmet.script].map((t) => t.toString()).join("\n    ")
    : "";
  const payload = JSON.stringify({ path: route, data }).replace(/</g, "\\u003c");
  return template
    .replace(/<title>[\s\S]*?<\/title>/, helmet ? "" : "$&")
    .replace("</head>", `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
    .replace("</body>", `  <script>window.__PRERENDER_DATA__=${payload}</script>\n  </body>`);
};

// ── Main ─────────────────────────────────────────────────────────────────────
const { render, loadRouteData, loadSiteData } = await import(
  pathToFileURL(join(SSR_DIST, "entry-server.js")).href
);

let site = { products: [], categories: [], articles: [], learnCategories: [] };
try {
  site = await loadSiteData();
} catch (err) {
  console.warn("prerender: couldn't load products/articles from Supabase —", err.message);
}

const routes = [
  ...STATIC_ROUTES,
  ...site.products.map((p) => `/products/${p.slug}`),
  ...site.articles.map((a) => `/learn/${a.slug}`),
];

const written = [];
for (const route of routes) {
  let data = {};
  try {
    data = await loadRouteData(route);
  } catch (err) {
    console.warn(`prerender: data for ${route} failed, rendering without it —`, err.message);
  }
  if (data === null) continue; // product/article vanished between list and fetch

  let rendered;
  try {
    rendered = render(route, data);
  } catch (err) {
    console.error(`prerender: ${route} threw while rendering`);
    throw err;
  }
  write(fileFor(route), assemble(route, rendered, data));
  written.push(route);
}

// Any path no route matches renders NotFound; Vercel serves this with a 404 status.
write(join(DIST, "404.html"), assemble("/404", render("/404", {}), {}));

// ── sitemap.xml ──────────────────────────────────────────────────────────────
const lastmodFor = new Map([
  ...site.products.map((p) => [`/products/${p.slug}`, p.updated_at]),
  ...site.articles.map((a) => [`/learn/${a.slug}`, a.updated_at || a.created_at]),
]);
const imagesFor = new Map(site.products.map((p) => [`/products/${p.slug}`, p.images || []]));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${written
  .map((route) => {
    const lastmod = lastmodFor.get(route);
    const images = imagesFor.get(route) || [];
    return [
      "  <url>",
      `    <loc>${escapeXml(`${SITE_URL}${route === "/" ? "" : route}`)}</loc>`,
      lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : null,
      ...images.map((img) => `    <image:image><image:loc>${escapeXml(absolute(img))}</image:loc></image:image>`),
      "  </url>",
    ].filter(Boolean).join("\n");
  })
  .join("\n")}
</urlset>
`;
write(join(DIST, "sitemap.xml"), sitemap);

// ── llms.txt / llms-full.txt ─────────────────────────────────────────────────
const price = (p) => `KES ${Number(p.price).toLocaleString("en-KE")}`;
const productLine = (p) =>
  `- [${p.name}](${SITE_URL}/products/${p.slug}): ${p.short_description || ""} (${price(p)}${p.stock_quantity > 0 ? "" : ", currently out of stock"})`;

const llms = `# Becof Organic Chemicals

> Becof Organic Chemicals Limited is a Kenyan agri-biotechnology company that makes microbial biofertilizers, biopesticides and organic soil amendments for farmers across Kenya and beyond. Products can be ordered online at ${SITE_URL} and paid for with M-Pesa. Delivery anywhere in Kenya costs a flat KES 500 per order, and is free on orders of KES 30,000 or more.

Contact: info@becoforganic.com, +254 735 283 397 (Mon–Fri, 8AM–6PM EAT). Based in Nairobi and Kilifi, Kenya.

Returns: products contain live microorganisms, so returns are not accepted. Items that arrive damaged, wrong, or past expiry are replaced or refunded if reported within 72 hours of delivery with the order number, photos and batch number.

## Products

${site.products.map(productLine).join("\n")}

## Learning Hub

${site.articles.map((a) => `- [${a.title}](${SITE_URL}/learn/${a.slug})${a.excerpt ? `: ${a.excerpt}` : ""}`).join("\n")}

## Company

- [About Becof](${SITE_URL}/about): Our story, mission, values and leadership
- [Environmental Impact](${SITE_URL}/impact): Sustainability metrics, ESG reports and awards
- [Become a Distributor](${SITE_URL}/partners): Apply to stock and sell Becof products
- [Affiliate Program](${SITE_URL}/affiliates): Earn by referring customers
- [Careers](${SITE_URL}/careers): Open positions
- [Contact](${SITE_URL}/contact): Phone, email and enquiry form

## Optional

- [Full product and article text](${SITE_URL}/llms-full.txt)
- [Terms of Service](${SITE_URL}/legal/terms): Ordering, delivery, returns and refunds
- [Privacy Policy](${SITE_URL}/legal/privacy)
`;
write(join(DIST, "llms.txt"), llms);

const specs = (s) => {
  if (!s || typeof s !== "object") return "";
  const entries = Array.isArray(s) ? s.map((x, i) => [x?.label ?? x?.name ?? i, x?.value ?? x]) : Object.entries(s);
  return entries.map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n");
};

const llmsFull = `# Becof Organic Chemicals — full product and article reference

${llms.split("\n## Products")[0].replace("# Becof Organic Chemicals\n\n", "")}
# Products
${site.products
  .map((p) =>
    [
      `\n## ${p.name}`,
      `URL: ${SITE_URL}/products/${p.slug}`,
      `Price: ${price(p)} · ${p.stock_quantity > 0 ? "In stock" : "Out of stock"}${p.categories?.name ? ` · Category: ${p.categories.name}` : ""}`,
      p.short_description,
      p.long_description ? stripHtml(p.long_description) : null,
      p.usage_instructions ? `### How to use\n${stripHtml(p.usage_instructions)}` : null,
      specs(p.specifications) ? `### Specifications\n${specs(p.specifications)}` : null,
    ].filter(Boolean).join("\n\n")
  )
  .join("\n")}

# Learning Hub articles
${site.articles
  .map((a) => `\n## ${a.title}\nURL: ${SITE_URL}/learn/${a.slug}\n\n${stripHtml(a.content)}`)
  .join("\n")}
`;
write(join(DIST, "llms-full.txt"), llmsFull);

// ── Google Merchant Center feed ──────────────────────────────────────────────
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Becof Organic Chemicals</title>
    <link>${SITE_URL}</link>
    <description>Organic biofertilizers, biopesticides and soil amendments</description>
${site.products
  .map((p) => {
    const images = (p.images || []).map(absolute);
    return `    <item>
      <g:id>${escapeXml(p.sku || p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(stripHtml(p.long_description) || p.short_description || p.name)}</g:description>
      <g:link>${SITE_URL}/products/${escapeXml(p.slug)}</g:link>
${images[0] ? `      <g:image_link>${escapeXml(images[0])}</g:image_link>\n` : ""}${images
      .slice(1, 11)
      .map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`)
      .join("")}      <g:availability>${p.stock_quantity > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} KES</g:price>
      <g:brand>Becof Organic Chemicals</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
${p.categories?.name ? `      <g:product_type>${escapeXml(p.categories.name)}</g:product_type>\n` : ""}    </item>`;
  })
  .join("\n")}
  </channel>
</rss>
`;
write(join(DIST, "merchant-feed.xml"), feed);

console.log(
  `prerender: wrote ${written.length} pages (${site.products.length} products, ${site.articles.length} articles) + 404, sitemap, llms.txt, merchant feed`
);

// ── IndexNow (Bing, Yandex, Seznam, Naver…) ──────────────────────────────────
// Production builds only, and only URLs changed in the last 3 days, so a
// routine redeploy doesn't spam "everything changed".
if (process.env.VERCEL_ENV === "production") {
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const changed = [...lastmodFor].filter(([, d]) => d && Date.parse(d) > cutoff).map(([r]) => `${SITE_URL}${r}`);
  if (changed.length) {
    changed.push(SITE_URL, `${SITE_URL}/products`, `${SITE_URL}/learn`);
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(SITE_URL).host,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: changed,
        }),
      });
      console.log(`prerender: IndexNow notified of ${changed.length} URLs (HTTP ${res.status})`);
    } catch (err) {
      console.warn("prerender: IndexNow ping failed —", err.message);
    }
  }
}

if (existsSync(SSR_DIST)) rmSync(SSR_DIST, { recursive: true, force: true });
