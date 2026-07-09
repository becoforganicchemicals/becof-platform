import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import {
  CheckCircle, TrendingUp, Globe, Award,
  MapPin, Phone, Mail, ExternalLink, Building2,
  Loader2, Facebook, Instagram, Twitter, Upload, Star,
} from "lucide-react";

/* ─── static data ─── */
const benefits = [
  { icon: TrendingUp, title: "Growing Market", desc: "Access Kenya's booming organic agriculture sector with a product line farmers trust." },
  { icon: Globe, title: "Nationwide Reach", desc: "Join a distribution network spanning 32+ counties across Kenya." },
  { icon: Award, title: "Premium Products", desc: "Industry-leading organic solutions with proven, measurable results." },
  { icon: CheckCircle, title: "Full Support", desc: "Training, marketing materials, and a dedicated account manager for every partner." },
];

const APPLICANT_TYPES = [
  { value: "agrovet", label: "Agrovet / Agricultural Input Shop" },
  { value: "cooperative", label: "Farmer Cooperative / SACCO" },
  { value: "wholesale_distributor", label: "Wholesale Agricultural Distributor" },
  { value: "farming_company", label: "Farming Company / Large-scale Farm" },
  { value: "ngo", label: "NGO / Development Organisation" },
  { value: "general_trader", label: "General Trader (Agricultural Focus)" },
  { value: "individual_farmer", label: "Individual Farmer" },
];

const PRODUCT_OPTIONS = [
  { value: "fertilizers", label: "Organic Fertilizers" },
  { value: "pesticides", label: "Organic Pesticides" },
  { value: "herbicides", label: "Bio-Herbicides" },
  { value: "soil_boosters", label: "Soil Boosters" },
  { value: "seeds", label: "Seeds & Seedlings" },
];

const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Machakos", "Meru", "Nyeri", "Kisii",
  "Kakamega", "Kericho", "Embu", "Muranga", "Kiambu", "Nyandarua", "Laikipia", "Samburu", "Trans Nzoia",
  "Uasin Gishu", "Elgeyo Marakwet", "Nandi", "Baringo", "Turkana", "West Pokot", "Siaya", "Kisumu",
  "Homa Bay", "Migori", "Nyamira", "Bungoma", "Busia", "Vihiga", "Tana River", "Lamu", "Taita Taveta",
  "Kilifi", "Kwale", "Garissa", "Wajir", "Mandera", "Isiolo", "Marsabit", "Tharaka Nithi", "Kirinyaga",
  "Kajiado", "Makueni", "Kitui", "Narok", "Bomet",
].sort();

interface PartnerProfile {
  id: string; display_name: string; tagline?: string; description?: string;
  logo_url?: string; phone?: string; email?: string; website?: string;
  county?: string; town?: string; partner_type?: string; products?: string[];
  featured?: boolean; facebook_url?: string; instagram_url?: string; twitter_url?: string;
}

/* ══════════════════════════════════════════════════════════════════ */
const Partners = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", business_name: "",
    applicant_type: "",
    years_in_business: "", county: "", town: "",
    expected_monthly_volume: "", has_storage_facility: false,
    storage_capacity: "", motivation: "",
  });

  useEffect(() => {
    supabase.from("partner_profiles")
      .select("*")
      .eq("published", true)
      .order("featured", { ascending: false })
      .then(({ data }) => setPartners(data || []));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const toggleProduct = (val: string) => {
    setSelectedProducts(prev =>
      prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
    );
  };

  const uploadCert = async (file: File) => {
    const name = `certs/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("partner-assets").upload(name, file);
    if (error) return null;
    return supabase.storage.from("partner-assets").getPublicUrl(name).data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.applicant_type || !form.county || !form.motivation || !certFile) {
      toast.error("Please fill all required fields and upload your business registration certificate"); return;
    }
    setSubmitting(true);

    let business_reg_cert_url: string | null = null;
    if (certFile) {
      business_reg_cert_url = await uploadCert(certFile);
    }

    const payload = {
      ...form,
      years_in_business: form.years_in_business ? Number(form.years_in_business) : null,
      products_interest: selectedProducts,
      business_reg_cert_url,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("distributor_applications")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      toast.error("Submission failed. Please try again.");
      setSubmitting(false); return;
    }

    // Send confirmation email (fire-and-forget, don't block on failure)
    supabase.functions.invoke("send-partner-email", {
      body: { application_id: data.id, type: "application_received" },
    }).catch(err => console.warn("Email notification failed:", err));

    setSubmitted(true);
    setSubmitting(false);
  };

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <Layout>
      <SEO
        title="Partners"
        description="Join Becof Organic Chemicals' growing network of distributors across Kenya. Apply to become a partner today."
        url="https://www.becoforganicchemicals.com/partners"
      />

      {/* ── Hero ── */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-white to-green-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #166534 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="container relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-4 tracking-wide uppercase">
              Distributor Partnership Programme
            </span>
            <h1 className="text-5xl font-bold mb-4 text-foreground">Partner With Becof</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Join our growing network of distributors and contribute to Africa's agricultural transformation.
              We're looking for committed partners across Kenya's 47 counties.
            </p>
          </motion.div>

          {/* benefits */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {benefits.map((b, i) => (
              <motion.div key={b.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-6 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* who qualifies */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-8 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Who Can Apply?</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {APPLICANT_TYPES.map(t => (
                <div key={t.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  {t.label}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              * All applicants must have a valid business registration and commit to Becof's sustainability and quality standards.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Application Form ── */}
      <section className="py-16 bg-background">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-2">Distributor Application</h2>
              <p className="text-muted-foreground">Fill in the form below. Applications are reviewed within 5–10 business days.</p>
            </div>

            {submitted ? (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-12 text-center">
                <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h3>
                <p className="text-muted-foreground mb-2">
                  Thank you for applying to become a Becof distributor partner.
                </p>
                <p className="text-sm text-muted-foreground">
                  A confirmation has been sent to <strong>{form.email}</strong>. Our team will review your application and get back to you within 5–10 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

                {/* Section 1: Personal Details */}
                <div className="p-8 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">1</span>
                    Personal / Contact Details
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Full Name *</label>
                      <Input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="John Kamau" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Email Address *</label>
                      <Input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Phone Number *</label>
                      <Input name="phone" value={form.phone} onChange={handleChange} required placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Applicant Type *</label>
                      <select name="applicant_type" value={form.applicant_type} onChange={handleChange} required
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background">
                        <option value="">Select type…</option>
                        {APPLICANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Business Details */}
                <div className="p-8 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">2</span>
                    Business Details
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Business / Company Name</label>
                      <Input name="business_name" value={form.business_name} onChange={handleChange} placeholder="e.g. Kamau Agrovet Ltd" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Years in Business</label>
                      <Input name="years_in_business" type="number" min={0} value={form.years_in_business} onChange={handleChange} placeholder="e.g. 5" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">County *</label>
                      <select name="county" value={form.county} onChange={handleChange} required
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background">
                        <option value="">Select county…</option>
                        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Town / Area</label>
                      <Input name="town" value={form.town} onChange={handleChange} placeholder="e.g. Thika Town" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Business Registration Certificate / Certificate of Incorporation *</label>
                      <div className={`border border-dashed ${certFile ? 'border-emerald-400' : 'border-border'} rounded-lg p-4 text-center hover:border-emerald-400 transition-colors`}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="certUpload"
                          onChange={e => setCertFile(e.target.files?.[0] || null)} className="hidden" />
                        <label htmlFor="certUpload" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {certFile ? certFile.name : "Click to upload certificate (PDF/Image)"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Operations */}
                <div className="p-8 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">3</span>
                    Operations & Capacity
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Products You'd Like to Distribute</label>
                      <div className="flex flex-wrap gap-2">
                        {PRODUCT_OPTIONS.map(p => (
                          <button key={p.value} type="button" onClick={() => toggleProduct(p.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedProducts.includes(p.value)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                              }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Expected Monthly Order Volume</label>
                      <select name="expected_monthly_volume" value={form.expected_monthly_volume} onChange={handleChange}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background">
                        <option value="">Select volume range…</option>
                        <option value="below_50_bags">Below 50 bags/units</option>
                        <option value="50_100_bags">50–100 bags/units</option>
                        <option value="100_500_bags">100–500 bags/units</option>
                        <option value="above_500_bags">Above 500 bags/units</option>
                        <option value="1_tonne">1–5 tonnes</option>
                        <option value="above_5_tonnes">Above 5 tonnes</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="has_storage" name="has_storage_facility"
                        checked={form.has_storage_facility}
                        onChange={e => setForm(prev => ({ ...prev, has_storage_facility: e.target.checked }))}
                        className="w-4 h-4 accent-primary rounded" />
                      <label htmlFor="has_storage" className="text-sm text-muted-foreground">I have a storage facility for agricultural products</label>
                    </div>
                    {form.has_storage_facility && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Storage Capacity</label>
                        <Input name="storage_capacity" value={form.storage_capacity} onChange={handleChange}
                          placeholder="e.g. 500 sq ft dry store, 2 tonnes capacity" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4: Motivation */}
                <div className="p-8">
                  <h3 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">4</span>
                    Why Partner With Becof?
                  </h3>
                  <Textarea name="motivation" value={form.motivation} onChange={handleChange} required rows={4}
                    placeholder="Tell us about your business, your customer base, and why you'd like to distribute Becof's organic products…"
                    className="resize-none" />
                  <p className="text-xs text-muted-foreground mt-2">Minimum 50 characters. Strong applications are detailed and specific.</p>

                  <Button type="submit" disabled={submitting}
                    className="w-full mt-6 h-12 text-base gap-2">
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting Application…</>
                      : "Submit Distributor Application"
                    }
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    By submitting, you agree to Becof's distributor terms and sustainability standards.
                  </p>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Approved Partner Profiles ── */}
      {partners.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-2">Our Partners</h2>
              <p className="text-muted-foreground">Trusted organisations supporting Becof's mission across Kenya.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all">
                  {/* card header */}
                  <div className="h-20 bg-gradient-to-br from-primary to-secondary relative">
                    {p.featured && (
                      <span className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                  {/* logo */}
                  <div className="relative z-10 px-5 -mt-12 mb-3">
                    <div className="w-24 h-24 rounded-xl border-2 border-background shadow-md bg-background overflow-hidden flex items-center justify-center p-2.5">
                      {p.logo_url
                        ? <img src={p.logo_url} alt={p.display_name} className="max-w-full max-h-full object-contain" />
                        : <Building2 className="h-10 w-10 text-muted-foreground/40" />
                      }
                    </div>
                  </div>
                  {/* content */}
                  <div className="px-5 pb-5">
                    <h3 className="font-bold text-foreground text-lg leading-tight">{p.display_name}</h3>
                    {p.tagline && <p className="text-xs text-primary font-medium mt-0.5">{p.tagline}</p>}
                    {p.partner_type && (
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full capitalize">
                        {p.partner_type.replace(/_/g, " ")}
                      </span>
                    )}
                    {p.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.description}</p>
                    )}
                    <div className="mt-4 space-y-1.5">
                      {(p.county || p.town) && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {[p.town, p.county].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {p.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {p.phone}
                        </p>
                      )}
                      {p.email && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {p.email}
                        </p>
                      )}
                    </div>
                    {/* products */}
                    {p.products && p.products.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {p.products.map(prod => (
                          <span key={prod} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full capitalize">
                            {prod.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* socials */}
                    <div className="mt-4 flex items-center gap-2">
                      {p.facebook_url && <a href={p.facebook_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-600 transition-colors"><Facebook className="h-4 w-4" /></a>}
                      {p.instagram_url && <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-pink-600 transition-colors"><Instagram className="h-4 w-4" /></a>}
                      {p.twitter_url && <a href={p.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-sky-500 transition-colors"><Twitter className="h-4 w-4" /></a>}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer"
                          className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

    </Layout>
  );
};

export default Partners;
