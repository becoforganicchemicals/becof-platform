import { ReactNode, useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";

export interface LegalSection {
  id: string;
  title: string;
}

const LegalLayout = ({
  title, description, lastUpdated, sections, children,
}: {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
  children: ReactNode;
}) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  // Highlight whichever section is currently in view as the visitor scrolls,
  // rather than only reacting to a manual click on a TOC entry.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Prefer the entry closest to the top of the trigger zone.
          const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
          setActiveId(topMost.target.id);
        }
      },
      // Trigger zone: roughly the top third of the viewport, offset for the sticky navbar.
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <Layout>
      <SEO title={title} description={description} url="https://www.becoforganicchemicals.com" />
      <section className="py-10">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

          <div className="grid lg:grid-cols-4 gap-10">
            {/* Table of contents */}
            <aside className="lg:col-span-1 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24 bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">On this page</p>
                <nav className="space-y-0.5 text-sm max-h-[70vh] overflow-y-auto">
                  {sections.map((s, i) => {
                    const isActive = s.id === activeId;
                    return (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className={`flex gap-2 py-1.5 pl-2.5 -ml-2.5 border-l-2 transition-colors ${
                          isActive
                            ? "border-primary text-primary font-medium"
                            : "border-transparent text-muted-foreground hover:text-primary"
                        }`}
                      >
                        <span className={`text-xs shrink-0 w-5 ${isActive ? "text-primary" : "text-muted-foreground/60"}`}>{i + 1}.</span>
                        <span>{s.title}</span>
                      </a>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div
              className="lg:col-span-3 order-1 lg:order-2 prose prose-slate max-w-none
                prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-24
                prose-h2:text-2xl prose-h3:text-xl
                prose-p:leading-relaxed prose-p:text-foreground
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-ul:text-foreground prose-ol:text-foreground
                prose-strong:text-foreground
                prose-table:text-sm"
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LegalLayout;
