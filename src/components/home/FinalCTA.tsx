import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake, Users, ShoppingBag } from "lucide-react";

const stats = [
  { value: "5,000+", label: "Farmers Served" },
  { value: "30+", label: "Certified Products" },
  { value: "8", label: "Counties Covered" },
  { value: "98%", label: "Customer Satisfaction" },
];

const FinalCTA = () => (
  <section className="py-24 bg-background">
    <div className="container">
      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-secondary p-12 md:p-16 text-center"
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-primary-foreground/70 bg-white/10 rounded-full mb-6">
            Join the Movement
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-5 leading-tight">
            Build a Sustainable Future With Us
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
            Join thousands of farmers, agro-dealers, and partners transforming agriculture across
            Kenya. Whether you're buying, distributing, or partnering — there's a place for you
            in the Becof ecosystem.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/products">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 font-semibold shadow-lg"
              >
                <ShoppingBag className="h-4 w-4" /> Shop Now
              </Button>
            </Link>
            <Link to="/partners">
              <Button
                size="lg"
                className="gap-2 font-semibold bg-transparent text-white border border-white/60 hover:bg-white/15 hover:border-white transition-all duration-300"
              >
                <Handshake className="h-4 w-4" /> Become a Distributor
              </Button>
            </Link>
            <Link to="/community">
              <Button
                size="lg"
                className="gap-2 font-semibold bg-transparent text-white border border-white/60 hover:bg-white/15 hover:border-white transition-all duration-300"
              >
                <Users className="h-4 w-4" /> Join Community
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default FinalCTA;
