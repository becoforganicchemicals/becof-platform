import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Clock, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Careers = () => {
  const { toast } = useToast();
  const [applyingTo, setApplyingTo] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cover_letter: "" });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_positions").select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    setSubmitting(true);

    try {
      let cvUrl: string | null = null;
      if (cvFile) {
        const ext = cvFile.name.split(".").pop();
        const path = `applications/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("career-cvs").upload(path, cvFile);
        if (uploadErr) throw uploadErr;
        cvUrl = path;
      }

      const { error } = await supabase.from("career_applications").insert({
        job_position_id: applyingTo?.id || null,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        cover_letter: form.cover_letter.trim() || null,
        cv_url: cvUrl,
      });
      if (error) throw error;

      setSubmitted(true);
      toast({ title: "Application submitted!", description: "We'll review your application and get back to you." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setApplyingTo(null);
    setForm({ full_name: "", email: "", phone: "", cover_letter: "" });
    setCvFile(null);
    setSubmitted(false);
  };

  return (
    <Layout>
      <section className="py-16">
        <div className="container max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
            <p className="text-lg text-muted-foreground max-w-7xl mx-auto">
              Help us revolutionize sustainable agriculture. Explore open positions and become part of the Becof family.
            </p>
          </motion.div>

          {/* Why Join Becof */}
          <section className="py-20 bg-muted/30">
            <div className="container max-w-7xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Join Becof?</h2>
                <p className="text-muted-foreground max-w-7xl mx-auto">
                  We don’t just build products — we build purpose-driven careers.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    title: "Our Mission",
                    desc: "Drive sustainability through groundbreaking eco-friendly innovations.",
                  },
                  {
                    title: "Career Growth",
                    desc: "Tailored training programs and leadership opportunities await you.",
                  },
                  {
                    title: "Impactful Work",
                    desc: "Contribute directly to global communities, agriculture, and the environment.",
                  },
                  {
                    title: "Benefits & Wellness",
                    desc: "Enjoy flexible work, health perks, and recognition for excellence.",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Career Growth & Development */}
          <section className="py-24">
            <div className="container max-w-7xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Career Growth & Development
                </h2>
                <p className="text-muted-foreground max-w-7xl mx-auto">
                  We invest in people who invest in impact.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  "Workshops, certifications, and continuous learning initiatives.",
                  "Leadership pipeline to nurture high-potential employees.",
                  "Collaboration with global industry experts and mentors.",
                  "Recognition programs celebrating excellence and innovation.",
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-6"
                  >
                    <p className="text-foreground">{item}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* What We Value */}
          <section className="py-20 bg-muted/30">
            <div className="container max-w-7xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  What We Value
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    title: "Innovation",
                    desc: "We foster creativity to build sustainable solutions for tomorrow.",
                  },
                  {
                    title: "Teamwork",
                    desc: "Collaboration is at the heart of everything we achieve together.",
                  },
                  {
                    title: "Excellence",
                    desc: "We strive for exceptional results that positively impact the world.",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg transition"
                  >
                    <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Life at Becof */}
          <section className="py-24">
            <div className="container max-w-7xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Life at Becof
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                At Becof, we celebrate diversity, nurture innovation, and support one another like family.
                Our people are our greatest asset, and we believe in growing together while making a meaningful difference.
              </p>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 bg-primary text-primary-foreground text-center">
            <div className="container max-w-7xl">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Shape the Future?
              </h2>
              <p className="mb-6 opacity-90">
                Explore opportunities to work on impactful projects and grow professionally with us.
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() =>
                  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
                }
              >
                View Open Positions
              </Button>
            </div>
          </section>

          {/* Open Positions */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : positions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Open Positions</h3>
                <p className="text-muted-foreground">Check back later for new opportunities.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {positions.map((pos, i) => (
                <motion.div key={pos.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold">{pos.title}</h3>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {pos.department && (
                              <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {pos.department}</span>
                            )}
                            {pos.location && (
                              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {pos.location}</span>
                            )}
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> <span className="capitalize">{pos.type}</span></span>
                          </div>
                          {pos.description && <p className="text-sm text-foreground/80 mt-2">{pos.description}</p>}
                        </div>
                        <Button onClick={() => setApplyingTo(pos)} className="shrink-0">Apply Now</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Application Dialog */}
      <Dialog open={!!applyingTo} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for: {applyingTo?.title}</DialogTitle>
          </DialogHeader>
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Application Submitted!</h3>
              <p className="text-muted-foreground">Thank you for your interest. We'll review your application soon.</p>
              <Button onClick={resetAndClose}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Cover Letter</Label><Textarea rows={4} value={form.cover_letter} onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))} placeholder="Tell us why you'd be a great fit..." /></div>
              <div>
                <Label>CV (PDF) *</Label>
                <Input type="file" accept=".pdf" onChange={e => setCvFile(e.target.files?.[0] || null)} required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Application
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Careers;
