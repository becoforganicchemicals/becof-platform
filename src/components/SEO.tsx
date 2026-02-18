import { Helmet } from "react-helmet-async";

interface SEOProps {
    title: string;
    description: string;
    url: string;
    image?: string;
}

const brand = "Becof Organic Chemicals";

const SEO = ({ title, description, url, image }: SEOProps) => {
    const fullTitle = `${title} | ${brand}`;
    const baseUrl = "https://www.becoforganicchemicals.com";

    const resolvedImage = image
        ? image.startsWith("http")
            ? image
            : `${baseUrl}${image}`
        : `${baseUrl}/default-og-image.png`;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            <meta name="robots" content="index, follow" />

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={brand} />
            <meta property="og:image" content={resolvedImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={resolvedImage} />
        </Helmet>
    );
};

export default SEO;
