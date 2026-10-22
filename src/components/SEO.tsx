import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/structuredData";

interface SEOProps {
    title: string;
    description: string;
    url: string;
    image?: string;
    noindex?: boolean;
    type?: "website" | "article" | "product";
    // schema.org objects, emitted as JSON-LD in <head>. Kept here rather than as
    // a <script> in the page body: React HTML-escapes script text when
    // pre-rendering, which would turn body JSON-LD into invalid JSON.
    jsonLd?: object | object[];
}

const brand = "Becof Organic Chemicals";

const SEO = ({ title, description, url, image, noindex, type = "website", jsonLd }: SEOProps) => {
    const fullTitle = `${title} | ${brand}`;

    const resolvedImage = image
        ? image.startsWith("http")
            ? image
            : `${SITE_URL}${image}`
        : `${SITE_URL}/default-og-image.png`;

    const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1"} />

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={brand} />
            <meta property="og:locale" content="en_KE" />
            <meta property="og:image" content={resolvedImage} />
            {/* Only the default image's size is known; page images vary */}
            {!image && <meta property="og:image:width" content="1536" />}
            {!image && <meta property="og:image:height" content="1024" />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={resolvedImage} />

            {schemas.map((schema, i) => (
                <script key={i} type="application/ld+json">
                    {JSON.stringify(schema).replace(/</g, "\\u003c")}
                </script>
            ))}
        </Helmet>
    );
};

export default SEO;
