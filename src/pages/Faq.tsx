import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { FAQS, faqSchema } from "@/lib/faq";
import { breadcrumbSchema, SITE_URL } from "@/lib/structuredData";

const Faq = () => (
  <Layout>
    <SEO
      title="Frequently Asked Questions"
      description="Answers about Becof organic biofertilizers: organic farming suitability, choosing products for your crop, how much to use per acre, pack sizes, delivery and returns."
      url={`${SITE_URL}/faq`}
      jsonLd={[
        faqSchema(FAQS),
        breadcrumbSchema([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]),
      ]}
    />
    <section className="py-12">
      <div className="container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Frequently asked questions</h1>
        <div className="space-y-8">
          {FAQS.map((f) => (
            <div key={f.question} className="border-b border-border pb-6">
              <h2 className="text-lg font-semibold mb-2">{f.question}</h2>
              <p className="text-muted-foreground">{f.answer}</p>
              {f.link && (
                <Link to={f.link.to} className="inline-block mt-2 text-sm text-primary hover:underline">
                  {f.link.label} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Faq;
