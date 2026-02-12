import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => (
  <section className="relative min-h-[90vh] flex items-center overflow-hidden">
    <div className="absolute inset-0">
      <img src={heroBg} alt="Sustainable farming" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
    </div>
    <div className="container relative z-10 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl"
      >
        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium rounded-full bg-secondary/20 text-primary-foreground border border-primary-foreground/20">
          🌱 Leading Sustainable Agriculture in Africa
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
          Transforming Agriculture with{" "}
          <span className="text-secondary">Eco-Friendly</span> Innovation
        </h1>
        <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed max-w-xl">
          Becof Organic Chemicals delivers cutting-edge biotechnology solutions that protect crops, enrich soils, and safeguard communities — sustainably.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/products">
            <Button size="lg" variant="secondary" className="gap-2 font-semibold">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/partners">
            <Button size="lg" variant="outline" className="gap-2 font-semibold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Users className="h-4 w-4" /> Become a Distributor
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
