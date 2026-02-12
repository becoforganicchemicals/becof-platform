import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Target, Eye, Heart, Shield, Sprout, Users } from "lucide-react";

const values = [
  { icon: Sprout, title: "Sustainability", desc: "Every decision prioritizes environmental stewardship." },
  { icon: Heart, title: "Community", desc: "Empowering farmers and communities across Africa." },
  { icon: Shield, title: "Integrity", desc: "Transparent, ethical practices in everything we do." },
  { icon: Target, title: "Innovation", desc: "Pioneering solutions through research and technology." },
];

const About = () => (
  <Layout>
    <section className="py-16">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">About Becof</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Becof Organic Chemicals Limited is an innovative agri-biotechnology company transforming agricultural sustainability in Kenya and beyond.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-card rounded-xl border border-border p-8">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Our Vision</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To lead the global transformation towards safer and more sustainable agriculture by pioneering innovative, eco-friendly chemical solutions that protect human health, enhance environmental well-being, and empower communities.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-card rounded-xl border border-border p-8">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-secondary" />
              <h2 className="text-2xl font-bold">Our Mission</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To innovate and manufacture a diverse range of eco-friendly chemical products that reduce environmental pollution, protect human health, and promote sustainable agricultural practices.
            </p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-10">Core Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center p-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <v.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-card rounded-xl border border-border p-8 text-center">
          <Users className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Leadership Team</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our leadership team brings together decades of experience in agricultural science, biotechnology, and sustainable business practices. Full team profiles coming soon.
          </p>
        </motion.div>
      </div>
    </section>
  </Layout>
);

export default About;
