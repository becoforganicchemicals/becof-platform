import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const contactDetails = [
  { icon: Phone, label: "Call Us", value: "+254 735 283 397", sub: "Mon–Fri, 8AM–6PM EAT" },
  { icon: Mail, label: "Email Us", value: "info@becoforganic.com", sub: "We reply within 24 hours" },
  { icon: MapPin, label: "Find Us", value: "Nairobi & Kilifi", sub: "Kenya" },
  { icon: Clock, label: "Open Hours", value: "Mon–Fri: 8AM – 6PM", sub: "East Africa Time" },
];

const TOPICS = [
  "Product Inquiry",
  "Bulk / Wholesale Order",
  "Partnership Opportunity",
  "Technical Support",
  "Sustainability & Certification",
  "Media & Press",
  "Other",
];

/* ══════════════════════════════════════════════════════════════════ */
const Contact = () => {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", topic: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email, and message."); return;
    }
    setError("");
    setSubmitting(true);

    // Save to Supabase contact_messages table
    await supabase.from("contact_messages").insert({
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      topic: form.topic || null,
      message: form.message,
    });

    // Send email notification via edge function
    await supabase.functions.invoke("send-contact-email", {
      body: { ...form, to: "info@becoforganic.com" },
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <Layout>
      <SEO
        title="Contact Us"
        description="Get in touch with Becof Organic Chemicals for product inquiries, bulk orders, or partnership opportunities."
        url="https://www.becoforganicchemicals.com/contact"
      />

      {/* ── Decorative botanical background ── */}
      <div className="relative overflow-hidden">
        {/* large faint leaf SVG top-right */}
        <svg
          className="absolute top-0 right-0 w-[480px] h-[480px] opacity-[0.04] pointer-events-none select-none"
          viewBox="0 0 200 200" fill="none"
        >
          <path
            d="M100 10 C60 10 10 50 10 100 C10 150 50 190 100 190 C100 190 100 100 190 100 C190 50 140 10 100 10Z"
            fill="#166534"
          />
          <line x1="100" y1="10" x2="100" y2="190" stroke="#166534" strokeWidth="2" />
          <line x1="100" y1="60" x2="55" y2="90" stroke="#166534" strokeWidth="1.5" />
          <line x1="100" y1="80" x2="60" y2="105" stroke="#166534" strokeWidth="1.5" />
          <line x1="100" y1="100" x2="65" y2="120" stroke="#166534" strokeWidth="1.5" />
          <line x1="100" y1="60" x2="145" y2="90" stroke="#166534" strokeWidth="1.5" />
          <line x1="100" y1="80" x2="140" y2="105" stroke="#166534" strokeWidth="1.5" />
          <line x1="100" y1="100" x2="135" y2="120" stroke="#166534" strokeWidth="1.5" />
        </svg>

        {/* dot pattern left */}
        <div
          className="absolute top-0 left-0 w-64 h-full opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #166534 1.5px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />

        <section className="py-20 relative">
          <div className="container">

            {/* ── Page header ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-600 mb-3">
                Get in Touch
              </span>
              <h1
                className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-4"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Let's Grow
                <br />
                <span className="text-emerald-700 italic">Together.</span>
              </h1>
              <p className="text-slate-500 max-w-md text-lg leading-relaxed">
                Whether you have a question about our products, a bulk order, or just want to say hello — we'd love to hear from you.
              </p>
            </motion.div>

            {/* ── Main grid ── */}
            <div className="grid lg:grid-cols-5 gap-12 items-start">

              {/* ── LEFT: contact cards + brand note ── */}
              <motion.div
                className="lg:col-span-2 space-y-4"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                {contactDetails.map((c, i) => (
                  <motion.div
                    key={c.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <c.icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{c.label}</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{c.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                    </div>
                  </motion.div>
                ))}

                {/* brand note */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 p-5 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #052e16 0%, #166534 100%)" }}
                >
                  <p
                    className="text-white text-lg font-bold mb-1 italic"
                    style={{ fontFamily: "'Georgia', serif" }}
                  >
                    "Rooted in nature,<br />driven by science."
                  </p>
                  <p className="text-emerald-200 text-xs mt-2 leading-relaxed">
                    Becof Organic Chemicals Limited is committed to sustainable agriculture across Kenya and East Africa.
                  </p>
                  <div className="mt-4 pt-4 border-t border-emerald-700 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/30 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-emerald-200" />
                    </div>
                    <div>
                      <p className="text-emerald-200 text-xs">Email us at</p>
                      <p className="text-white text-sm font-semibold">info@becoforganic.com</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* ── RIGHT: form ── */}
              <motion.div
                className="lg:col-span-3"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

                  {/* form header strip */}
                  <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900 text-xl" style={{ fontFamily: "'Georgia', serif" }}>
                        Send Us a Message
                      </h2>
                      <p className="text-slate-400 text-sm mt-0.5">We'll get back to you within 24 hours.</p>
                    </div>
                    <div className="hidden sm:flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-200" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-600" />
                    </div>
                  </div>

                  {submitted ? (
                    <div className="px-8 py-16 text-center">
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                          <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h3
                          className="text-2xl font-bold text-slate-900 mb-2"
                          style={{ fontFamily: "'Georgia', serif" }}
                        >
                          Message Sent!
                        </h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                          Thank you, <strong>{form.name}</strong>. We've received your message and will reply to{" "}
                          <strong>{form.email}</strong> within 24 hours.
                        </p>
                        <button
                          onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", topic: "", message: "" }); }}
                          className="mt-6 text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                        >
                          Send another message
                        </button>
                      </motion.div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
                      {/* Name + Email */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Full Name <span className="text-emerald-600">*</span>
                          </label>
                          <Input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder="Jane Wanjiku"
                            className="h-11 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Email Address <span className="text-emerald-600">*</span>
                          </label>
                          <Input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            placeholder="jane@example.com"
                            className="h-11 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>

                      {/* Phone + Topic */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Phone Number <span className="text-slate-300">(optional)</span>
                          </label>
                          <Input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+254 7XX XXX XXX"
                            className="h-11 rounded-xl border-slate-200 focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Topic
                          </label>
                          <select
                            name="topic"
                            value={form.topic}
                            onChange={handleChange}
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 py-2 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          >
                            <option value="">Select a topic…</option>
                            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Message <span className="text-emerald-600">*</span>
                        </label>
                        <Textarea
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          placeholder="Tell us how we can help you…"
                          className="rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 resize-none"
                        />
                      </div>

                      {error && (
                        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                          {error}
                        </p>
                      )}

                      <Button
                        type="submit"
                        disabled={submitting}
                        size="lg"
                        className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-base font-semibold gap-2 transition-all"
                      >
                        {submitting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                        ) : (
                          <>Send Message <ArrowRight className="h-4 w-4" /></>
                        )}
                      </Button>

                      <p className="text-xs text-center text-slate-400">
                        Your message goes directly to our team at{" "}
                        <span className="text-slate-600 font-medium">info@becoforganic.com</span>
                      </p>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Contact;
