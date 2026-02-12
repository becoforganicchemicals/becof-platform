import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { TrendingUp, Droplets, TreePine, Award, Download, Globe, Users, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

const metrics = [
  { icon: Users, label: "Farmers Empowered", value: "15,000+", color: "text-primary" },
  { icon: Globe, label: "Hectares Improved", value: "50,000+", color: "text-secondary" },
  { icon: Droplets, label: "Water Pollution Reduced", value: "40%", color: "text-accent" },
  { icon: TreePine, label: "Carbon Offset (tons)", value: "12,000", color: "text-earth" },
  { icon: Leaf, label: "Organic Products Delivered", value: "200,000+", color: "text-secondary" },
  { icon: TrendingUp, label: "Farmer Income Increase", value: "65%", color: "text-primary" },
];

const awards = [
  "Kenya Green Innovation Award 2025",
  "East Africa Sustainability Excellence",
  "KEBS Quality Certification",
  "ISO 14001 Environmental Management",
];

const Impact = () => (
  <Layout>
    <section className="py-16">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <h1 className="text-4xl font-bold mb-4">Our Impact</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We measure our success not just in revenue, but in the lives we touch, the land we restore, and the future we protect.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {metrics.map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border p-6 text-center hover:shadow-lg transition-shadow">
              <m.icon className={`h-8 w-8 mx-auto mb-3 ${m.color}`} />
              <div className="text-3xl font-bold mb-1">{m.value}</div>
              <div className="text-sm text-muted-foreground">{m.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-10 md:p-14 text-primary-foreground mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Sustainability Commitment</h2>
          <p className="text-primary-foreground/80 max-w-2xl mb-6">
            Every Becof product undergoes rigorous environmental impact assessment. We are committed to net-zero emissions by 2030 and 100% biodegradable packaging by 2027.
          </p>
          <Button variant="secondary" className="gap-2">
            <Download className="h-4 w-4" /> Download ESG Report 2025
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-bold mb-6 text-center">Awards & Recognition</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {awards.map(a => (
              <div key={a} className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
                <Award className="h-5 w-5 text-earth flex-shrink-0" />
                <span className="text-sm font-medium">{a}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  </Layout>
);

export default Impact;
