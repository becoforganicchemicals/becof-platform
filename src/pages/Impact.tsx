import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import {
  TrendingUp, Droplets, TreePine, Award, Download,
  Globe, Users, Leaf, Calendar, FileText, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

/* ─── icon map ─── */
const iconMap: Record<string, React.ElementType> = {
  Users, Globe, Droplets, TreePine, Leaf, TrendingUp, Award, FileText,
};

interface Metric { id: string; icon: string; label: string; value: string; sort_order: number; }
interface Report { id: string; title: string; year: number; description?: string; file_url: string; }
interface ImpactAward { id: string; name: string; awarded_date: string; image_url?: string; }

/* ─── animated counter ─── */
const StatCard = ({ metric, index }: { metric: Metric; index: number }) => {
  const Icon = iconMap[metric.icon] || Leaf;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
      className="relative group bg-white rounded-2xl border border-slate-100 p-7 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      {/* subtle bg blob */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mb-4 group-hover:bg-emerald-100 transition-colors">
          <Icon className="h-7 w-7" />
        </div>
        <div className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">{metric.value}</div>
        <div className="text-sm text-slate-500 font-medium">{metric.label}</div>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
const Impact = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [awards, setAwards] = useState<ImpactAward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: m }, { data: r }, { data: a }] = await Promise.all([
      supabase.from("impact_metrics").select("*").order("sort_order"),
      supabase.from("esg_reports").select("*").eq("published", true).order("year", { ascending: false }),
      supabase.from("impact_awards").select("*").order("awarded_date", { ascending: false }),
    ]);
    setMetrics(m || []);
    setReports(r || []);
    setAwards(a || []);
    setLoading(false);
  };

  /* ─── skeleton ─── */
  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
  );

  return (
    <Layout>
      <SEO
        title="Environmental Impact"
        description="Learn about Becof Organic Chemicals' environmental impact, sustainability initiatives, and commitment to responsible chemical manufacturing."
        url="https://www.becoforganicchemicals.com/impact"
      />

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-700 text-white py-20 overflow-hidden">
        {/* decorative rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-white/5" />
        </div>
        <div className="container relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold tracking-widest uppercase mb-6 border border-white/20">
              <Leaf className="h-3.5 w-3.5" /> Growing with Purpose
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
              Our Impact on <br className="hidden md:block" />Kenya's Agriculture
            </h1>
            <p className="text-emerald-100/80 max-w-xl mx-auto text-lg leading-relaxed">
              We are a young company with a big mission — empowering farmers, restoring land, and building a healthier Kenya, one harvest at a time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="py-16 bg-slate-50">
        <div className="container">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">By the Numbers</h2>
            <p className="text-slate-500 mt-1 text-sm">Real progress, honestly measured.</p>
          </motion.div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {metrics.map((m, i) => <StatCard key={m.id} metric={m} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Sustainability commitment ── */}
      <section className="py-16">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative bg-gradient-to-r from-emerald-700 to-green-600 rounded-3xl p-10 md:p-14 text-white overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Our Sustainability Commitment</h2>
              <p className="text-white/80 mb-6 leading-relaxed">
                Every Becof product undergoes rigorous environmental impact assessment. As we grow, we are committed to achieving net-zero emissions and transitioning to 100% biodegradable packaging — because the future of farming must also be the future of our planet.
              </p>

              {/* ESG reports */}
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map(n => <Skeleton key={n} className="h-12 bg-white/20" />)}
                </div>
              ) : reports.length === 0 ? (
                <p className="text-white/60 text-sm italic">ESG Report coming soon.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {reports.map(r => (
                    <a
                      key={r.id}
                      href={r.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-800 font-semibold text-sm rounded-xl hover:bg-emerald-50 transition-colors shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      {r.title} {r.year}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Awards ── */}
      <section className="py-16 bg-slate-50">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Awards & Recognition</h2>
            <p className="text-slate-500 mt-1 text-sm">Milestones that keep us going.</p>
          </motion.div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {[1, 2, 3].map(n => <Skeleton key={n} className="h-56" />)}
            </div>
          ) : awards.length === 0 ? (
            <p className="text-center text-slate-400 py-10">Awards and recognitions will appear here.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {awards.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* award image */}
                  <div className="h-36 bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center overflow-hidden">
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <Award className="h-14 w-14 text-amber-400" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-2">{a.name}</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(a.awarded_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Impact;
