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
        <div className="container max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Help us revolutionize sustainable agriculture. Explore open positions and become part of the Becof family.
            </p>
          </motion.div>

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
