import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, ShoppingCart, Search, SlidersHorizontal } from "lucide-react";

const categories = ["All", "Crop Protection", "Soil Enhancement", "Pest Management", "Organic Fertilizer", "Growth Stimulants"];

const allProducts = [
  { name: "BioShield Pro", category: "Crop Protection", price: 2500, rating: 4.8, desc: "Advanced organic crop protectant for sustainable pest management.", stock: true },
  { name: "SoilVita Plus", category: "Soil Enhancement", price: 3200, rating: 4.9, desc: "Premium organic soil conditioner with beneficial microorganisms.", stock: true },
  { name: "EcoGuard 360", category: "Pest Management", price: 1800, rating: 4.7, desc: "Eco-friendly broad-spectrum pest control for all crop types.", stock: true },
  { name: "GreenGrow Max", category: "Organic Fertilizer", price: 2800, rating: 4.6, desc: "High-performance organic fertilizer for maximum yield.", stock: true },
  { name: "RootBoost Elite", category: "Growth Stimulants", price: 2100, rating: 4.5, desc: "Root development enhancer for stronger, healthier plants.", stock: false },
  { name: "CropShield Nano", category: "Crop Protection", price: 3500, rating: 4.8, desc: "Next-gen nano-technology crop protection formula.", stock: true },
  { name: "MicroSoil Pro", category: "Soil Enhancement", price: 2900, rating: 4.7, desc: "Microbial soil enhancer for depleted farmlands.", stock: true },
  { name: "PestAway Natural", category: "Pest Management", price: 1500, rating: 4.4, desc: "100% natural pest deterrent safe for organic farming.", stock: true },
];

const Products = () => {
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");

  let filtered = allProducts
    .filter(p => activeCat === "All" || p.category === activeCat)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);

  return (
    <Layout>
      <section className="py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="text-4xl font-bold mb-2">Our Products</h1>
            <p className="text-muted-foreground">Premium organic solutions for sustainable agriculture</p>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="border border-border rounded-lg px-4 py-2 bg-card text-sm"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              <option value="popular">Popularity</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(c => (
              <Button
                key={c}
                variant={activeCat === c ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCat(c)}
              >
                {c}
              </Button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="h-44 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl">🌿</span>
                  </div>
                  {!p.stock && (
                    <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                      Out of Stock
                    </span>
                  )}
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
                    <span className="font-bold text-primary">KES {p.price.toLocaleString()}</span>
                    <Button size="sm" disabled={!p.stock} className="gap-1">
                      <ShoppingCart className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Products;
