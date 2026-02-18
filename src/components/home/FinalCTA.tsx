import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake } from "lucide-react";

const FinalCTA = () => (
  <section className="py-20">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-r from-primary to-secondary p-12 md:p-16 text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Build a Sustainable Future With Us
        </h2>
        <p className="text-primary-foreground/80 max-w-7xl mx-auto mb-8">
          Join thousands of farmers transforming agriculture across Kenya. Whether you're a farmer, distributor, or partner - there's a place for you.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/products">
            <Button size="lg" variant="secondary" className="gap-2 font-semibold">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/partners">
            <Button
              size="lg"
              className="gap-2 font-semibold bg-transparent text-white border border-white/70 hover:bg-white/15 hover:border-white transition-all duration-300"
            >
              <Handshake className="h-4 w-4" /> Partner With Us
            </Button>

          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

export default FinalCTA;
