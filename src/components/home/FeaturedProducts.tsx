import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ArrowRight } from "lucide-react";

const products = [
  { name: "BioShield Pro", category: "Crop Protection", price: "KES 2,500", rating: 4.8, desc: "Advanced organic crop protectant for sustainable pest management." },
  { name: "SoilVita Plus", category: "Soil Enhancement", price: "KES 3,200", rating: 4.9, desc: "Premium organic soil conditioner enriched with beneficial microorganisms." },
  { name: "EcoGuard 360", category: "Pest Management", price: "KES 1,800", rating: 4.7, desc: "Eco-friendly broad-spectrum pest control solution for all crop types." },
  { name: "GreenGrow Max", category: "Organic Fertilizer", price: "KES 2,800", rating: 4.6, desc: "High-performance organic fertilizer for maximum yield and soil health." },
];

const FeaturedProducts = () => (
  <section className="py-20">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Products</h2>
          <p className="text-muted-foreground">Our most trusted solutions for sustainable farming</p>
        </div>
        <Link to="/products" className="hidden md:block">
          <Button variant="outline" className="gap-2">View All <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
          >
            <div className="h-48 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-2xl">🌿</span>
              </div>
            </div>
            <div className="p-5">
              <span className="text-xs font-medium text-accent">{p.category}</span>
              <h3 className="font-semibold text-lg mt-1 mb-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.desc}</p>
              <div className="flex items-center gap-1 mb-3">
                <Star className="h-3.5 w-3.5 fill-earth text-earth" />
                <span className="text-sm font-medium">{p.rating}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">{p.price}</span>
                <Button size="sm" className="gap-1">
                  <ShoppingCart className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-center mt-8 md:hidden">
        <Link to="/products">
          <Button variant="outline" className="gap-2">View All Products <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  </section>
);

export default FeaturedProducts;
