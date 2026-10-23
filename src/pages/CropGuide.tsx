import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock, Droplets, Sprout } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import NotFound from "./NotFound";
import WhatsAppOrderButton from "@/components/WhatsAppOrderButton";
import ProgrammeCalculator, { type ProgrammeProduct } from "@/components/product/ProgrammeCalculator";
import { findProgramme, HANDLING_NOTES } from "@/lib/cropProgrammes";
import { fetchPublishedProducts } from "@/lib/publicData";
import { getPrerendered } from "@/lib/prerenderData";
import { breadcrumbSchema, SITE_URL } from "@/lib/structuredData";
import { faqSchema, type Faq } from "@/lib/faq";
import { formatLitres, LITRES_PER_ACRE, WATER_LITRES_PER_ACRE, packSummary } from "@/lib/packs";

type ProductRow = ProgrammeProduct & { price: number; images: string[] | null };
type ProductsData = { products: ProductRow[] };

const CropGuide = () => {
  const { slug } = useParams<{ slug: string }>();
  const programme = findProgramme(slug);
  const [products, setProducts] = useState<ProductRow[]>(
    () => getPrerendered<ProductsData>("products")?.products ?? []
  );

  useEffect(() => {
    fetchPublishedProducts()
      .then((data) => setProducts(data.products as ProductRow[]))
      .catch(() => {}); // keep what's showing (pre-rendered) — see publicData.ts
  }, []);

  if (!programme) return <NotFound />;

  const url = `${SITE_URL}/crops/${programme.slug}`;
  const productFor = (productSlug: string) => products.find((p) => p.slug === productSlug);
  const exampleAcres = 5;

  const faqs: Faq[] = [
    {
      question: `Which Becof products should I use on ${programme.name.toLowerCase()}?`,
      answer: programme.steps
        .map((s) => `${productFor(s.productSlug)?.name ?? s.productSlug}: ${s.purpose.toLowerCase()}`)
        .join(". ") + ".",
    },
    {
      question: `How much do I need per acre of ${programme.name.toLowerCase()}?`,
      answer: `Each application is ${LITRES_PER_ACRE} litres of product per acre, mixed with ${WATER_LITRES_PER_ACRE} litres of water. With ${programme.steps[0].applications} applications per season, a ${exampleAcres}-acre farm needs ${formatLitres(LITRES_PER_ACRE * exampleAcres * programme.steps[0].applications)} of ${productFor(programme.steps[0].productSlug)?.name ?? "each product"}.`,
    },
    {
      question: `When should I apply biofertilizers on ${programme.name.toLowerCase()}?`,
      answer: programme.steps
        .map((s) => `${productFor(s.productSlug)?.name ?? s.productSlug}: ${s.timing.charAt(0).toLowerCase()}${s.timing.slice(1)}`)
        .join(". ") + ".",
    },
  ];

  return (
    <Layout>
      <SEO
        title={programme.title}
        description={programme.description}
        url={url}
        jsonLd={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Crop guides", path: "/crops" },
            { name: programme.name, path: `/crops/${programme.slug}` },
          ]),
          faqSchema(faqs),
        ]}
      />

      <section className="py-12 bg-muted/30 border-b border-border">
        <div className="container max-w-4xl">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link to="/crops" className="hover:text-primary">Crop guides</Link> / {programme.name}
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{programme.title}</h1>
          <p className="text-lg text-muted-foreground">{programme.intro}</p>
          {programme.crops && <p className="text-sm text-muted-foreground mt-3">Covers: {programme.crops}.</p>}
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-4xl space-y-10">
          <div>
            <h2 className="text-2xl font-semibold mb-2">The {programme.name.toLowerCase()} programme</h2>
            <p className="text-muted-foreground mb-6">
              Every application is {LITRES_PER_ACRE} L per acre, mixed with {WATER_LITRES_PER_ACRE} L of water.
            </p>
            <div className="grid gap-4">
              {programme.steps.map((step) => {
                const product = productFor(step.productSlug);
                return (
                  <div key={step.productSlug} className="flex gap-4 rounded-xl border border-border p-4 bg-card">
                    {product?.images?.[0] && (
                      <Link to={`/products/${step.productSlug}`} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                      </Link>
                    )}
                    <div className="space-y-1.5 min-w-0">
                      <Link to={`/products/${step.productSlug}`} className="text-lg font-semibold hover:text-primary">
                        {product?.name ?? step.productSlug}
                      </Link>
                      <p className="flex gap-2 text-sm"><Sprout className="h-4 w-4 text-primary shrink-0 mt-0.5" />{step.purpose}</p>
                      <p className="flex gap-2 text-sm"><CalendarClock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span><span className="font-medium">When:</span> {step.timing} — {step.applications} application{step.applications === 1 ? "" : "s"} per season.</span>
                      </p>
                      {step.note && <p className="text-xs text-muted-foreground">{step.note}</p>}
                      {product && (
                        <p className="text-xs text-muted-foreground">
                          KES {product.price.toLocaleString("en-KE")} {packSummary(product.product_variants)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ProgrammeCalculator programme={programme} products={products} />

          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Droplets className="h-5 w-5 text-primary" />Mixing and handling</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              {HANDLING_NOTES.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Questions about {programme.name.toLowerCase()}</h2>
            <div className="space-y-5">
              {faqs.map((f) => (
                <div key={f.question}>
                  <h3 className="font-semibold mb-1">{f.question}</h3>
                  <p className="text-muted-foreground">{f.answer}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm">
              More answers in our <Link to="/faq" className="text-primary hover:underline">FAQ</Link>.
            </p>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 space-y-3">
            <h2 className="text-lg font-semibold">Not sure what your farm needs?</h2>
            <p className="text-muted-foreground">Tell us your crop and farm size on WhatsApp and our team will plan it with you.</p>
            <WhatsAppOrderButton
              message={`Hi Becof Organic Chemicals! I farm ${programme.name.toLowerCase()} and would like help choosing products and quantities.\n\nFarm size: ___ acres\nLocation: ___`}
              label="Ask on WhatsApp"
              className="sm:w-auto px-6"
            />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CropGuide;
