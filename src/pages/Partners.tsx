import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, TrendingUp, Globe, Award, ChevronDown } from "lucide-react";
import { useState } from "react";

const benefits = [
  { icon: TrendingUp, title: "Growing Market", desc: "Access Kenya's booming organic agriculture sector." },
  { icon: Globe, title: "Nationwide Reach", desc: "Distribution network spanning 32+ counties." },
  { icon: Award, title: "Premium Products", desc: "Industry-leading organic solutions with proven results." },
  { icon: CheckCircle, title: "Full Support", desc: "Training, marketing materials, and dedicated account management." },
];

const faqs = [
  { q: "What are the requirements to become a distributor?", a: "You need a valid business registration, storage facilities for agricultural products, and a commitment to our sustainability standards." },
  { q: "What territories are available?", a: "We are actively expanding across all 47 counties in Kenya. Contact us for availability in your region." },
  { q: "What margins can I expect?", a: "Distributor margins range from 15-30% depending on volume and product category." },
];

const Partners = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <Layout>
      <section className="py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <h1 className="text-4xl font-bold mb-4">Partner With Becof</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join our growing network of distributors and contribute to Africa's agricultural transformation.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {benefits.map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl border border-border p-6 text-center">
                <b.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="max-w-2xl mx-auto bg-card rounded-xl border border-border p-8 mb-16">
            <h2 className="text-2xl font-bold mb-6 text-center">Distributor Application</h2>
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Full Name" />
                <Input placeholder="Company Name" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Email Address" type="email" />
                <Input placeholder="Phone Number" type="tel" />
              </div>
              <Input placeholder="Location / County" />
              <Textarea placeholder="Tell us about your business and why you'd like to partner with Becof..." rows={4} />
              <Button className="w-full" size="lg">Submit Application</Button>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left font-medium"
                  >
                    {faq.q}
                    <ChevronDown className={`h-4 w-4 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Partners;
