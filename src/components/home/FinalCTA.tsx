import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Handshake, ShoppingBag, Megaphone, ArrowRight } from "lucide-react";

const FinalCTA = () => (
  <section className="py-24 bg-background">
    <div className="container">

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
          </div>

          {/* Lighter-weight than the two buttons above, deliberately — this
              keeps Shop Now / Become a Distributor as the two real choices
              here, while still surfacing the affiliate program for anyone
              scanning past who it happens to resonate with. */}
          <Link
            to="/affiliates"
            className="group inline-flex items-center gap-1.5 mt-6 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <Megaphone className="h-3.5 w-3.5" />
            Prefer to earn commission instead? Become an Affiliate
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

export default FinalCTA;
