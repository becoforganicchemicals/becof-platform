import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { BookOpen, FlaskConical, FileText, Calendar, User, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category_id: string;
  author?: string;
  published: boolean;
  created_at: string;
}

const tabs = [
  { id: "blogs-insights", label: "Blog & Insights", icon: FileText },
  { id: "farming-guides", label: "Farming Guides", icon: BookOpen },
  { id: "research-innovation", label: "Research & Innovation", icon: FlaskConical },
];

const estimateReadTime = (content: string) => {
  const words = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const Learn = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("blogs-insights");
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from("learn_categories").select("*");
    const { data: artData } = await supabase
      .from("learn_articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    setCategories(catData || []);
    setArticles(artData || []);
    setLoading(false);
  };

  const filtered = articles.filter((a) => {
    const category = categories.find((c) => c.id === a.category_id);
    return category?.slug === activeTab;
  });

  const activeCategory = tabs.find((t) => t.id === activeTab);

  return (
    <Layout>
      <SEO
        title="Learning Hub"
        description="Explore educational resources, research insights, and farming guides to support sustainable agriculture practices."
        url="https://www.becoforganicchemicals.com/learn"
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100 py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-3">Learning Hub</h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Knowledge and resources for sustainable agriculture — guides, research, and insights from the field.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tabs + Articles */}
      <section className="py-12">
        <div className="container">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-10">
            {tabs.map((t) => (
              <Button
                key={t.id}
                variant={activeTab === t.id ? "default" : "outline"}
                onClick={() => setActiveTab(t.id)}
                className={`gap-2 transition-all ${activeTab === t.id
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                  : "hover:border-emerald-300 hover:text-emerald-700"
                  }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Button>
            ))}
          </div>

          {/* Section label */}
          {activeCategory && (
            <motion.p
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground mb-6"
            >
              {filtered.length} article{filtered.length !== 1 ? "s" : ""} in{" "}
              <span className="font-medium text-foreground">{activeCategory.label}</span>
            </motion.p>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-xl border border-border p-6 space-y-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Articles grid */}
          {!loading && (
            <div className="grid md:grid-cols-2 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-2 text-center py-16">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">No articles available in this category yet.</p>
                </div>
              ) : (
                filtered.map((a, i) => (
                  <motion.article
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => navigate(`/learn/${a.slug}`)}
                    className="group bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer flex flex-col"
                  >
                    {/* Category badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full w-fit mb-3 border border-emerald-100">
                      {activeCategory && <activeCategory.icon className="h-3 w-3" />}
                      {tabs.find((t) => t.id === categories.find((c) => c.id === a.category_id)?.slug)?.label || "Article"}
                    </span>

                    <h3 className="text-xl font-semibold mb-2 group-hover:text-emerald-700 transition-colors leading-snug">
                      {a.title}
                    </h3>

                    {a.excerpt && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-1">{a.excerpt}</p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {a.author || "Becof Team"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(a.created_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {estimateReadTime(a.content)} min read
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-emerald-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Learn;
