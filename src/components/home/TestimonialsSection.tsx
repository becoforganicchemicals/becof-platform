import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  { name: "Grace Wanjiku", role: "Smallholder Farmer, Nyeri", text: "Becof products transformed my tomato farm. My yields doubled and I no longer worry about harmful chemicals affecting my family's health." },
  { name: "James Odhiambo", role: "Commercial Farmer, Kisumu", text: "The quality of Becof's organic fertilizers is unmatched. My soil health improved dramatically within one season." },
  { name: "Mary Chebet", role: "Agricultural Extension Officer", text: "I recommend Becof to all the farmers I work with. Their commitment to sustainability and farmer education is truly commendable." },
];

const TestimonialsSection = () => {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setIdx((i) => (i + 1) % testimonials.length);

  return (
    <section className="py-20 bg-card">
      <div className="container max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Farmers Say</h2>
        </motion.div>
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="text-center px-8"
            >
              <Quote className="h-10 w-10 text-primary/20 mx-auto mb-6" />
              <p className="text-lg md:text-xl leading-relaxed text-foreground/80 mb-8 italic">
                "{testimonials[idx].text}"
              </p>
              <div>
                <p className="font-semibold">{testimonials[idx].name}</p>
                <p className="text-sm text-muted-foreground">{testimonials[idx].role}</p>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-3 mt-8">
            <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
