import { motion } from "framer-motion";
import { Leaf, Smartphone, Lightbulb, FlaskConical, Globe2, ShieldCheck } from "lucide-react";

const items = [
  {
    icon: Leaf,
    title: "Eco-Friendly Crop Protection",
    desc: "Our certified organic agricultural chemicals protect your crops from pests, disease, and environmental stress — without toxic residues, without harming pollinators, and without compromising food safety.",
    stat: "100% Organic",
  },
  {
    icon: FlaskConical,
    title: "Agri-Biotechnology R&D",
    desc: "We invest deeply in proprietary research to develop next-generation biological crop inputs. From microbial inoculants to bio-stimulants, our lab-to-farm pipeline keeps Kenyan agriculture at the frontier of science.",
    stat: "Cutting-Edge Science",
  },
  {
    icon: Smartphone,
    title: "Digital Farmer Empowerment",
    desc: "Our integrated platform gives farmers access to agronomist advice, soil health diagnostics, weather alerts, and precision buying tools — right from their phones. Better decisions, better harvests.",
    stat: "Always-On Support",
  },
  {
    icon: Globe2,
    title: "Sustainable Supply Chains",
    desc: "We partner with local distributors, cooperatives, and agro-dealers to ensure our products reach the last-mile farmer. From Nairobi to Kisumu, our supply network is expanding across East Africa.",
    stat: "Nationwide Reach",
  },
  {
    icon: ShieldCheck,
    title: "Farmer Safety & Compliance",
    desc: "Every product we make meets Kenya Bureau of Standards and PCPB certification. We train farmers on safe handling, proper dosing, and integrated pest management to protect lives and livelihoods.",
    stat: "KEBS & PCPB Certified",
  },
  {
    icon: Lightbulb,
    title: "Sustainable Innovation",
    desc: "We partner with universities, NGOs, and government bodies to pilot regenerative agriculture programs. Our pilot farms across Kenya test and validate sustainable practices before we share them at scale.",
    stat: "Community-Led Impact",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const WhatWeDo = () => (
  <section className="py-24 bg-card relative overflow-hidden">
    {/* Decorative background */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
    </div>

    <div className="container relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 rounded-full mb-4">
          Our Mission in Action
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">What We Do</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Becof Organic Chemicals is more than a product company. We are building an end-to-end
          ecosystem for sustainable, profitable, and dignified farming across Kenya and East Africa.
        </p>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {items.map((item) => (
          <motion.div
            key={item.title}
            variants={cardVariants}
            className="group relative glass-card rounded-2xl p-7 hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30 flex flex-col gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-xs font-semibold text-secondary tracking-wide uppercase">
                  {item.stat}
                </span>
                <h3 className="text-lg font-semibold mt-0.5">{item.title}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default WhatWeDo;
