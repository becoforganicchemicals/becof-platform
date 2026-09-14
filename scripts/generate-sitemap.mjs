#!/usr/bin/env node
// Regenerates public/sitemap.xml before every production build, pulling in
// every published product and Learn article from Supabase — the previous
// sitemap was a static, hand-written file that only ever listed 8 top-level
// pages, so nothing in the catalog was discoverable via the sitemap at all.
// Falls back to static-pages-only (never fails the build) if Supabase env
// vars aren't available in this environment.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const BASE_URL = "https://www.becoforganicchemicals.com";
const today = new Date().toISOString().slice(0, 10);

const staticPages = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/products", changefreq: "weekly", priority: "0.9" },
    { path: "/learn", changefreq: "weekly", priority: "0.8" },
    { path: "/impact", changefreq: "monthly", priority: "0.7" },
    { path: "/about", changefreq: "yearly", priority: "0.7" },
    { path: "/partners", changefreq: "monthly", priority: "0.7" },
    { path: "/affiliates", changefreq: "monthly", priority: "0.6" },
    { path: "/contact", changefreq: "yearly", priority: "0.6" },
    { path: "/careers", changefreq: "monthly", priority: "0.6" },
    { path: "/legal/privacy", changefreq: "yearly", priority: "0.3" },
    { path: "/legal/terms", changefreq: "yearly", priority: "0.3" },
    { path: "/legal/cookies", changefreq: "yearly", priority: "0.3" },
    { path: "/legal/accessibility", changefreq: "yearly", priority: "0.3" },
];

const escapeXml = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const urlEntry = ({ loc, lastmod, changefreq, priority }) => `
  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

async function main() {
    let productEntries = "";
    let articleEntries = "";
    let productCount = 0;
    let articleCount = 0;

    if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        const { data: products, error: productsError } = await supabase
            .from("products")
            .select("slug, updated_at")
            .eq("is_published", true);
        if (productsError) {
            console.warn("sitemap: failed to fetch products —", productsError.message);
        } else {
            productCount = products?.length ?? 0;
            productEntries = (products || [])
                .map((p) =>
                    urlEntry({
                        loc: `${BASE_URL}/products/${p.slug}`,
                        lastmod: (p.updated_at || today).slice(0, 10),
                        changefreq: "weekly",
                        priority: "0.8",
                    })
                )
                .join("");
        }

        const { data: articles, error: articlesError } = await supabase
            .from("learn_articles")
            .select("slug, updated_at")
            .eq("published", true);
        if (articlesError) {
            console.warn("sitemap: failed to fetch learn articles —", articlesError.message);
        } else {
            articleCount = articles?.length ?? 0;
            articleEntries = (articles || [])
                .map((a) =>
                    urlEntry({
                        loc: `${BASE_URL}/learn/${a.slug}`,
                        lastmod: (a.updated_at || today).slice(0, 10),
                        changefreq: "monthly",
                        priority: "0.6",
                    })
                )
                .join("");
        }
    } else {
        console.warn(
            "sitemap: VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY not set — generating static pages only"
        );
    }

    const staticEntries = staticPages
        .map((p) =>
            urlEntry({ loc: `${BASE_URL}${p.path}`, lastmod: today, changefreq: p.changefreq, priority: p.priority })
        )
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries}${productEntries}${articleEntries}
</urlset>
`;

    writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
    console.log(
        `sitemap: wrote ${staticPages.length} static pages + ${productCount} products + ${articleCount} articles`
    );
}

main().catch((err) => {
    // Never fail the build over the sitemap — log it and move on.
    console.warn("sitemap: generation failed, leaving existing public/sitemap.xml in place —", err.message);
});
