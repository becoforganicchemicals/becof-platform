import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { BookOpen, FlaskConical, FileText, Calendar, User, Tag } from "lucide-react";
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

const Learn = () => {
  const [activeTab, setActiveTab] = useState("blogs-insights");
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: catData } = await supabase.from("learn_categories").select("*");
    const { data: artData } = await supabase
      .from("learn_articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    setCategories(catData || []);
    setArticles(artData || []);
  };

  const filtered = articles.filter((a) => {
    const category = categories.find((c) => c.id === a.category_id);
    return category?.slug === activeTab;
  });

  return (
    <Layout>
      <SEO
        title="Learning Hub"
        description="Explore educational resources, research insights, and farming guides to support sustainable agriculture practices."
        url="https://www.becoforganicchemicals.com/learn"
      />
      <section className="py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="text-4xl font-bold mb-2">Learning Hub</h1>
            <p className="text-muted-foreground">Knowledge and resources for sustainable agriculture</p>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-10">
            {tabs.map((t) => (
              <Button
                key={t.id}
                variant={activeTab === t.id ? "default" : "outline"}
                onClick={() => setActiveTab(t.id)}
                className="gap-2"
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </Button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground col-span-2">
                No articles available in this category yet.
              </p>
            ) : (
              filtered.map((a, i) => (
                <motion.article
                  key={a.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-wrap gap-2 mb-3">
                    {a.excerpt && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        <Tag className="h-3 w-3" /> {a.excerpt}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{a.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{a.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.author || "Becof Team"}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </motion.article>
              ))
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Learn;
