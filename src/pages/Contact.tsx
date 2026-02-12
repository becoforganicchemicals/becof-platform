import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Calendar, User, BookOpen } from "lucide-react";
import { useState } from "react";

const contactInfo = [
  { icon: MapPin, label: "Address", value: "Nairobi, Kenya" },
  { icon: Phone, label: "Phone", value: "+254 700 000 000" },
  { icon: Mail, label: "Email", value: "info@becof.co.ke" },
  { icon: Clock, label: "Hours", value: "Mon-Fri: 8AM - 6PM EAT" },
];

const experts = ["Dr. Sarah Kimani - Soil Science", "James Mwangi - Crop Protection", "Dr. Peter Oloo - Organic Certification"];
const topics = ["Product Consultation", "Bulk Order Inquiry", "Partnership Discussion", "Technical Support", "Sustainability Audit"];

const Contact = () => {
  const [tab, setTab] = useState<"inquiry" | "booking">("inquiry");

  return (
    <Layout>
      <section className="py-16">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Get in touch with our team for inquiries, consultations, or partnership opportunities.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              {contactInfo.map(c => (
                <div key={c.label} className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
                  <c.icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.value}</p>
                  </div>
                </div>
              ))}
              <div className="bg-primary/5 rounded-xl p-4 h-48 flex items-center justify-center border border-border">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm">Map integration coming soon</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-8">
              <div className="flex gap-2 mb-6">
                <Button variant={tab === "inquiry" ? "default" : "outline"} onClick={() => setTab("inquiry")} className="gap-2">
                  <Mail className="h-4 w-4" /> General Inquiry
                </Button>
                <Button variant={tab === "booking" ? "default" : "outline"} onClick={() => setTab("booking")} className="gap-2">
                  <Calendar className="h-4 w-4" /> Book Consultation
                </Button>
              </div>

              {tab === "inquiry" ? (
                <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input placeholder="Your Name" />
                    <Input placeholder="Email Address" type="email" />
                  </div>
                  <Input placeholder="Subject" />
                  <Textarea placeholder="Your message..." rows={5} />
                  <Button className="w-full" size="lg">Send Message</Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input placeholder="Your Name" />
                    <Input placeholder="Email Address" type="email" />
                  </div>
                  <select className="w-full border border-border rounded-lg px-4 py-2 bg-background text-sm">
                    <option value="">Select an Expert</option>
                    {experts.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <select className="w-full border border-border rounded-lg px-4 py-2 bg-background text-sm">
                    <option value="">Select a Topic</option>
                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Input type="date" />
                  <Textarea placeholder="Additional notes..." rows={3} />
                  <Button className="w-full" size="lg">Book Consultation</Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
