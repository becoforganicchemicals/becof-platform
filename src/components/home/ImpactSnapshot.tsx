import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const counters = [
  { label: "Farmers Empowered", target: 15000, suffix: "+" },
  { label: "Hectares Improved", target: 50000, suffix: "+" },
  { label: "Pollution Reduced", target: 40, suffix: "%" },
  { label: "Counties Reached", target: 32, suffix: "" },
];

function useCountUp(target: number, inView: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [inView, target]);
  return count;
}

const CounterCard = ({ label, target, suffix, inView }: { label: string; target: number; suffix: string; inView: boolean }) => {
  const count = useCountUp(target, inView);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-primary-foreground mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-primary-foreground/70 text-sm font-medium">{label}</div>
    </div>
  );
};

const ImpactSnapshot = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-20 bg-gradient-to-br from-primary to-secondary">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Our Impact</h2>
          <p className="text-primary-foreground/70 max-w-xl mx-auto">
            Measurable results driving sustainable change across Kenya
          </p>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {counters.map(c => <CounterCard key={c.label} {...c} inView={inView} />)}
        </div>
        <div className="text-center">
          <Link to="/impact">
            <Button variant="secondary" className="gap-2">
              View Full Impact Report <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ImpactSnapshot;
