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
  CheckCircle, TrendingUp, Globe, Award, ChevronDown,
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

const faqs = [
  { q: "What are the requirements to become a distributor?", a: "You need a valid business registration, appropriate storage facilities for agricultural products, and a genuine commitment to our sustainability standards. Agrovets, cooperatives, and wholesale dealers are especially encouraged to apply." },
  { q: "What territories are available?", a: "We are actively expanding across all 47 counties in Kenya. Priority is given to underserved agricultural regions. Contact us for specific availability in your area." },
  { q: "What margins can I expect?", a: "Distributor margins range from 15–30% depending on volume and product category. High-volume partners qualify for additional incentives and exclusive territory rights." },
  { q: "How long does the approval process take?", a: "Applications are reviewed within 5–10 business days. You will receive email updates at every stage — submission, review, and final decision." },
  { q: "Do I need prior experience in agricultural chemicals?", a: "Prior experience is an advantage but not mandatory. We provide comprehensive product training and onboarding support for all approved partners." },
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", business_name: "",
    applicant_type: "", business_reg_number: "", kra_pin: "",
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
    if (!form.full_name || !form.email || !form.phone || !form.applicant_type || !form.county || !form.motivation) {
      toast.error("Please fill all required fields"); return;
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

    // Send confirmation email
    await supabase.functions.invoke("send-partner-email", {
      body: { application_id: data.id, type: "application_received" },
    });

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
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full mb-4 tracking-wide uppercase">
              Distributor Partnership Programme
            </span>
            <h1 className="text-5xl font-bold mb-4 text-slate-900">Partner With Becof</h1>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
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
                className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <b.icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-800">{b.title}</h3>
                <p className="text-sm text-slate-500">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* who qualifies */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Who Can Apply?</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {APPLICANT_TYPES.map(t => (
                <div key={t.value} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  {t.label}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              * All applicants must have a valid business registration and commit to Becof's sustainability and quality standards.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Application Form ── */}
      <section className="py-16 bg-white">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Distributor Application</h2>
              <p className="text-slate-500">Fill in the form below. Applications are reviewed within 5–10 business days.</p>
            </div>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
                <p className="text-slate-600 mb-2">
                  Thank you for applying to become a Becof distributor partner.
                </p>
                <p className="text-sm text-slate-500">
                  A confirmation has been sent to <strong>{form.email}</strong>. Our team will review your application and get back to you within 5–10 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Section 1: Personal Details */}
                <div className="p-8 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">1</span>
                    Personal / Contact Details
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Full Name *</label>
                      <Input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="John Kamau" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Email Address *</label>
                      <Input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Phone Number *</label>
                      <Input name="phone" value={form.phone} onChange={handleChange} required placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Applicant Type *</label>
                      <select name="applicant_type" value={form.applicant_type} onChange={handleChange} required
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">Select type…</option>
                        {APPLICANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Business Details */}
                <div className="p-8 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">2</span>
                    Business Details
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Business / Company Name</label>
                      <Input name="business_name" value={form.business_name} onChange={handleChange} placeholder="e.g. Kamau Agrovet Ltd" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Business Reg. Number</label>
                      <Input name="business_reg_number" value={form.business_reg_number} onChange={handleChange} placeholder="e.g. CPR/2020/123456" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">KRA PIN</label>
                      <Input name="kra_pin" value={form.kra_pin} onChange={handleChange} placeholder="e.g. P051234567X" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Years in Business</label>
                      <Input name="years_in_business" type="number" min={0} value={form.years_in_business} onChange={handleChange} placeholder="e.g. 5" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">County *</label>
                      <select name="county" value={form.county} onChange={handleChange} required
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">Select county…</option>
                        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Town / Area</label>
                      <Input name="town" value={form.town} onChange={handleChange} placeholder="e.g. Thika Town" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-500 block mb-1">Business Registration Certificate</label>
                      <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-emerald-400 transition-colors">
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" id="certUpload"
                          onChange={e => setCertFile(e.target.files?.[0] || null)} className="hidden" />
                        <label htmlFor="certUpload" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="h-6 w-6 text-slate-400" />
                          <span className="text-sm text-slate-500">
                            {certFile ? certFile.name : "Click to upload certificate (PDF/Image)"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Operations */}
                <div className="p-8 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
                    Operations & Capacity
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-2">Products You'd Like to Distribute</label>
                      <div className="flex flex-wrap gap-2">
                        {PRODUCT_OPTIONS.map(p => (
                          <button key={p.value} type="button" onClick={() => toggleProduct(p.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedProducts.includes(p.value)
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
                              }`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 block mb-1">Expected Monthly Order Volume</label>
                      <select name="expected_monthly_volume" value={form.expected_monthly_volume} onChange={handleChange}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
                        className="w-4 h-4 accent-emerald-600 rounded" />
                      <label htmlFor="has_storage" className="text-sm text-slate-600">I have a storage facility for agricultural products</label>
                    </div>
                    {form.has_storage_facility && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Storage Capacity</label>
                        <Input name="storage_capacity" value={form.storage_capacity} onChange={handleChange}
                          placeholder="e.g. 500 sq ft dry store, 2 tonnes capacity" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4: Motivation */}
                <div className="p-8">
                  <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold">4</span>
                    Why Partner With Becof?
                  </h3>
                  <Textarea name="motivation" value={form.motivation} onChange={handleChange} required rows={4}
                    placeholder="Tell us about your business, your customer base, and why you'd like to distribute Becof's organic products…"
                    className="resize-none" />
                  <p className="text-xs text-slate-400 mt-2">Minimum 50 characters. Strong applications are detailed and specific.</p>

                  <Button type="submit" disabled={submitting}
                    className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base gap-2">
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting Application…</>
                      : "Submit Distributor Application"
                    }
                  </Button>
                  <p className="text-xs text-slate-400 text-center mt-3">
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
        <section className="py-16 bg-slate-50">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Our Distributor Network</h2>
              <p className="text-slate-500">Trusted partners distributing Becof products across Kenya.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all">
                  {/* card header */}
                  <div className="h-20 bg-gradient-to-br from-emerald-600 to-green-700 relative">
                    {p.featured && (
                      <span className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                  {/* logo */}
                  <div className="px-5 -mt-8 mb-3">
                    <div className="w-16 h-16 rounded-xl border-2 border-white shadow-md bg-white overflow-hidden flex items-center justify-center">
                      {p.logo_url
                        ? <img src={p.logo_url} alt={p.display_name} className="w-full h-full object-cover" />
                        : <Building2 className="h-8 w-8 text-slate-300" />
                      }
                    </div>
                  </div>
                  {/* content */}
                  <div className="px-5 pb-5">
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{p.display_name}</h3>
                    {p.tagline && <p className="text-xs text-emerald-600 font-medium mt-0.5">{p.tagline}</p>}
                    {p.partner_type && (
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">
                        {p.partner_type.replace(/_/g, " ")}
                      </span>
                    )}
                    {p.description && (
                      <p className="text-sm text-slate-500 mt-3 line-clamp-2">{p.description}</p>
                    )}
                    <div className="mt-4 space-y-1.5">
                      {(p.county || p.town) && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {[p.town, p.county].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {p.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {p.phone}
                        </p>
                      )}
                      {p.email && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {p.email}
                        </p>
                      )}
                    </div>
                    {/* products */}
                    {p.products && p.products.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {p.products.map(prod => (
                          <span key={prod} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full capitalize">
                            {prod.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* socials */}
                    <div className="mt-4 flex items-center gap-2">
                      {p.facebook_url && <a href={p.facebook_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors"><Facebook className="h-4 w-4" /></a>}
                      {p.instagram_url && <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors"><Instagram className="h-4 w-4" /></a>}
                      {p.twitter_url && <a href={p.twitter_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-500 transition-colors"><Twitter className="h-4 w-4" /></a>}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noopener noreferrer"
                          className="ml-auto text-xs text-emerald-600 hover:underline flex items-center gap-1">
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

      {/* ── FAQs ── */}
      <section className="py-16 bg-white">
        <div className="container max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-center mb-8 text-slate-900">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-medium text-slate-800 hover:text-emerald-700 transition-colors"
                  >
                    {faq.q}
                    <ChevronDown className={`h-4 w-4 shrink-0 ml-4 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="px-5 pb-5 text-sm text-slate-500 leading-relaxed">
                      {faq.a}
                    </motion.div>
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
