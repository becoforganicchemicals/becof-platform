import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MessageCircle, Search, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import CropButtons from "@/components/CropButtons";
import WhatsAppOrderButton from "@/components/WhatsAppOrderButton";
import { Input } from "@/components/ui/input";
import { FAQ_CATEGORIES, FAQS, faqSchema, type Faq as FaqItem } from "@/lib/faq";
import { breadcrumbSchema, SITE_URL } from "@/lib/structuredData";

// Native <details> rather than an accordion component: collapsed answers stay
// in the HTML, so search engines and AI crawlers read every answer, and the
// questions open and close even before the page's JavaScript has loaded.
const Question = ({ faq, open }: { faq: FaqItem; open?: boolean }) => (
  <details open={open} className="group rounded-xl border border-border bg-card open:border-primary/40 open:shadow-sm transition-colors">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
      {faq.question}
      <ChevronDown className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
      <p>{faq.answer}</p>
      {faq.link && (
        <Link to={faq.link.to} className="inline-block mt-3 text-sm font-medium text-primary hover:underline">
          {faq.link.label} →
        </Link>
      )}
    </div>
  </details>
);

const Faq = () => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? FAQS.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(q))
    : FAQS;

  return (
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

      <section className="py-12 md:py-16 bg-muted/30 border-b border-border">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Frequently asked questions</h1>
          <p className="text-muted-foreground mb-8">
            Everything farmers ask us about our products, how to use them, ordering and delivery.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions, e.g. delivery, per acre, organic"
              aria-label="Search questions"
              className="h-12 pl-11 pr-10 rounded-xl bg-card text-base"
            />
            {query && (
              <button
                type="button" onClick={() => setQuery("")} aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {!q && (
            <nav aria-label="FAQ categories" className="flex flex-wrap justify-center gap-2 mt-6 lg:hidden">
              {FAQ_CATEGORIES.map((c) => (
                <a
                  key={c.id}
                  href={`#${c.id}`}
                  className="rounded-full border-2 border-primary/20 bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {c.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="container space-y-12">
          <div className="grid lg:grid-cols-[15rem_minmax(0,1fr)] gap-10">
            {/* Desktop: categories as a sticky sidebar (phones get the buttons above) */}
            <aside className="hidden lg:block">
              <nav aria-label="FAQ categories" className="sticky top-24 space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Categories</p>
                {FAQ_CATEGORIES.map((c) => (
                  <a
                    key={c.id}
                    href={`#${c.id}`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/5 hover:text-primary transition-colors"
                  >
                    {c.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="min-w-0 space-y-12">
              {q ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {matches.length} result{matches.length === 1 ? "" : "s"} for “{query.trim()}”
                  </p>
                  {matches.map((f) => <Question key={`search-${f.question}`} faq={f} open />)}
                  {matches.length === 0 && (
                    <p className="text-muted-foreground">
                      No questions match that. Ask us directly on WhatsApp below — we're happy to help.
                    </p>
                  )}
                </div>
              ) : (
                FAQ_CATEGORIES.map((c) => (
                  <div key={c.id} id={c.id} className="scroll-mt-24 space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{c.title}</h2>
                    {FAQS.filter((f) => f.category === c.id).map((f) => <Question key={f.question} faq={f} />)}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 md:p-8 space-y-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold">Still have questions?</h2>
                <p className="text-muted-foreground">Tell us your crop and farm size, and our team will help you choose.</p>
              </div>
            </div>
            <WhatsAppOrderButton
              message={"Hi Becof Organic Chemicals! I have a question about your products.\n\nCrop: ___\nFarm size: ___ acres"}
              label="Ask us on WhatsApp"
              className="sm:w-auto px-6"
            />
          </div>

          <CropButtons title="Find the right products for your crop" />
        </div>
      </section>
    </Layout>
  );
};

export default Faq;
