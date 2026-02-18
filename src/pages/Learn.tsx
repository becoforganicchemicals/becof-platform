import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { BookOpen, FlaskConical, Award, FileText, Calendar, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const tabs = [
  { id: "blog", label: "Blog & Insights", icon: FileText },
  { id: "guides", label: "Farming Guides", icon: BookOpen },
  { id: "research", label: "Research & Innovation", icon: FlaskConical },
  { id: "certs", label: "Certifications", icon: Award },
];

const articles = [
  { tab: "blog", title: "The Future of Organic Farming in East Africa", author: "Dr. Sarah Kimani", date: "Jan 15, 2026", tags: ["Organic", "Trends"], excerpt: "Explore how organic farming practices are reshaping agricultural landscapes across East Africa." },
  { tab: "blog", title: "5 Ways to Reduce Chemical Runoff", author: "James Mwangi", date: "Dec 28, 2025", tags: ["Environment", "Tips"], excerpt: "Practical strategies every farmer can implement to protect waterways and soil health." },
  { tab: "guides", title: "Complete Guide to Organic Pest Management", author: "Becof Research Team", date: "Feb 1, 2026", tags: ["Pest Control", "Guide"], excerpt: "A comprehensive guide to managing pests without synthetic chemicals." },
  { tab: "guides", title: "Soil Health Assessment: A Farmer's Handbook", author: "Dr. Peter Oloo", date: "Jan 20, 2026", tags: ["Soil", "Guide"], excerpt: "Learn how to assess and improve your soil health using simple, accessible methods." },
  { tab: "research", title: "Nano-Biotechnology in Crop Protection", author: "Becof R&D Lab", date: "Jan 10, 2026", tags: ["Innovation", "Research"], excerpt: "Our latest breakthroughs in applying nanotechnology to organic crop protection." },
  { tab: "certs", title: "Organic Farming Certification Pathway", author: "Compliance Team", date: "Dec 15, 2025", tags: ["Certification", "Compliance"], excerpt: "Step-by-step guide to achieving organic farming certification in Kenya." },
];

const Learn = () => {
  const [activeTab, setActiveTab] = useState("blog");
  const filtered = articles.filter(a => a.tab === activeTab);

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
            {tabs.map(t => (
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
            {filtered.map((a, i) => (
              <motion.article
                key={a.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {a.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      <Tag className="h-3 w-3" />{tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-xl font-semibold mb-2">{a.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{a.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.author}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{a.date}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Learn;
