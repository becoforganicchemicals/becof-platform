import { motion } from "framer-motion";
import { MessageSquare, BookOpen, ShoppingBag, Shield } from "lucide-react";

const highlights = [
  { icon: MessageSquare, title: "Community Forum", desc: "Connect with farmers and experts in our growing community." },
  { icon: BookOpen, title: "Learning Hub", desc: "Access courses, guides, and certifications for sustainable farming." },
  { icon: ShoppingBag, title: "Smart Purchasing", desc: "Bulk pricing, wishlists, and personalized recommendations." },
  { icon: Shield, title: "Secure Payments", desc: "M-Pesa, card payments, and tokenized security for peace of mind." },
];

const PlatformHighlights = () => (
  <section className="py-20 bg-primary/5">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Highlights</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          More than a store — a complete ecosystem for modern agriculture
        </p>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {highlights.map((h, i) => (
          <motion.div
            key={h.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <h.icon className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="font-semibold mb-2">{h.title}</h3>
            <p className="text-sm text-muted-foreground">{h.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PlatformHighlights;
