import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ArrowRight } from "lucide-react";

interface FeaturedPartner {
  id: string;
  display_name: string;
  tagline?: string;
  logo_url?: string;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const FeaturedPartners = () => {
  const [partners, setPartners] = useState<FeaturedPartner[]>([]);

  useEffect(() => {
    supabase
      .from("partner_profiles")
      .select("id, display_name, tagline, logo_url")
      .eq("published", true)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setPartners(data || []));
  }, []);

  if (partners.length === 0) return null;

  return (
    <section className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 rounded-full mb-4">
            Trusted Partners
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Partners Powering Our Growth</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Distributors, agro-dealers, and organisations working alongside Becof to reach farmers across Kenya.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {partners.map((p) => (
            <motion.div
              key={p.id}
              variants={cardVariants}
              className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="w-28 h-28 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden p-3 mb-4">
                {p.logo_url
                  ? <img src={p.logo_url} alt={p.display_name} className="max-w-full max-h-full object-contain" />
                  : <Building2 className="h-10 w-10 text-muted-foreground/40" />
                }
              </div>
              <h3 className="font-semibold text-sm leading-tight">{p.display_name}</h3>
              {p.tagline && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.tagline}</p>}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link to="/partners">
            <Button variant="outline" className="gap-2">
              View All Partners <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedPartners;
