import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  BookOpen,
  ShoppingBag,
  Shield,
  MapPin,
  BarChart2,
  Truck,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    icon: ShoppingBag,
    title: "Full E-Commerce Store",
    desc: "Browse, compare, and purchase certified organic crop inputs with detailed usage guides, stock levels, and bulk pricing tiers.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "M-Pesa & Secure Payments",
    desc: "Pay seamlessly with M-Pesa, credit card, or bank transfer. Every transaction is encrypted and fully tokenized.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: BookOpen,
    title: "Learning Hub",
    desc: "Access agronomist-led courses, video guides, usage manuals, and certifications that help farmers get the most from every product.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: MessageSquare,
    title: "Community Forum",
    desc: "Ask questions, share field experiences, and get real answers from certified agronomists and fellow farmers across Kenya.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: MapPin,
    title: "Distributor Locator",
    desc: "Find the nearest authorised Becof agro-dealer or distributor using our interactive map — whether you're in Nairobi or Kitui.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: BarChart2,
    title: "Farmer Dashboard",
    desc: "Track your orders, view purchase history, manage saved addresses, and access personalised product recommendations in one place.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: Truck,
    title: "Nationwide Delivery",
    desc: "Order online and get your products delivered to your farm or nearest pickup point. Reliable fulfilment tracked end-to-end.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: HeartHandshake,
    title: "Partner & Distributor Portal",
    desc: "Agro-dealers and distributors get dedicated accounts, wholesale pricing, inventory tools, and co-marketing support.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const PlatformHighlights = () => (
  <section className="py-24 bg-primary/5 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
    </div>

    <div className="container relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 rounded-full mb-4">
          The Full Ecosystem
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Highlights</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Becof is not just a store. It is a complete digital platform designed to support every
          step of a farmer's journey — from discovery to delivery to growth.
        </p>
      </motion.div>

      <motion.div
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {highlights.map((h) => (
          <motion.div
            key={h.title}
            variants={cardVariants}
            className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
          >
            <div
              className={`w-11 h-11 rounded-xl ${h.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
            >
              <h.icon className={`h-5 w-5 ${h.color}`} />
            </div>
            <h3 className="font-semibold text-sm mb-2">{h.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{h.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mt-12"
      >
        <Link to="/products">
          <Button className="gap-2">Explore the Platform</Button>
        </Link>
      </motion.div>
    </div>
  </section>
);

export default PlatformHighlights;
