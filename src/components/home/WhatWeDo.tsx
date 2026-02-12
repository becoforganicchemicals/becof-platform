import { motion } from "framer-motion";
import { Leaf, Smartphone, Lightbulb } from "lucide-react";

const items = [
  { icon: Leaf, title: "Eco-Friendly Solutions", desc: "Organic agricultural chemicals that protect crops without harming the environment or human health." },
  { icon: Smartphone, title: "Digital Farmer Empowerment", desc: "Technology-driven tools and education that help farmers make smarter, more sustainable decisions." },
  { icon: Lightbulb, title: "Sustainable Innovation", desc: "Pioneering research in agri-biotechnology to build a cleaner, more productive agricultural future." },
];

const WhatWeDo = () => (
  <section className="py-20 bg-card">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">What We Do</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Driving sustainable agriculture through innovative organic solutions, digital empowerment, and environmental stewardship.
        </p>
      </motion.div>
      <div className="grid md:grid-cols-3 gap-8">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="glass-card rounded-xl p-8 text-center hover:shadow-xl transition-shadow"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <item.icon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhatWeDo;
