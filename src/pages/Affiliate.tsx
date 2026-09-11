import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliate } from "@/hooks/useAffiliate";
import { Button } from "@/components/ui/button";
import {
  Megaphone, Share2, Banknote, ShieldCheck, ArrowRight,
  Users, MessageCircle, Sparkles, Loader2,
} from "lucide-react";

const steps = [
  { icon: Sparkles, title: "Apply", desc: "Tell us a bit about yourself and how you'll share Becof — agrovet, farming group, social media, WhatsApp community, anything works." },
  { icon: Share2, title: "Get Your Link", desc: "Once approved, you get a personal trackable link you can share anywhere — no code to memorize." },
  { icon: Users, title: "People Buy", desc: "Anyone who clicks your link and orders within 30 days is credited to you automatically." },
  { icon: Banknote, title: "Get Paid", desc: "Earn 8% commission on every order that's actually delivered and paid for — request a payout to M-Pesa anytime you clear KES 1,000." },
];

const faqs = [
  { q: "Do I need to be a Becof customer already?", a: "No — anyone with a Becof account can apply. Agrovets, farming influencers, cooperative leaders, and independent sales agents are all a great fit." },
  { q: "When do I actually get paid?", a: "Only once an order placed through your link is confirmed delivered and fully paid — never for a click, a signup, or an order that's later cancelled or refunded." },
  { q: "Is there a limit to how much I can earn?", a: "No cap. Every qualifying order earns commission, for as long as you're an active affiliate." },
  { q: "How long does my link stay attributed to a visitor?", a: "30 days from their first click — if they order any time in that window, it's credited to you." },
];

const Affiliate = () => {
  const { user } = useAuth();
  const { affiliate, affiliateLoading } = useAffiliate();

  const ctaHref = !user ? "/signin" : "/profile?tab=affiliate";
  const ctaLabel = !user
    ? "Sign In to Apply"
    : affiliate
      ? "View My Affiliate Dashboard"
      : "Apply to Become an Affiliate";

  return (
    <Layout>
      <SEO
        title="Affiliate Program"
        description="Earn commission promoting Becof Organic Chemicals' products. Apply to become an affiliate and get a trackable link, real-time stats, and M-Pesa payouts."
        url="https://www.becoforganicchemicals.com/affiliates"
      />

      {/* ── Hero ── */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-white to-green-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #166534 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="container relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-4 tracking-wide uppercase">
              <Megaphone className="h-3.5 w-3.5" /> Affiliate Program
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Earn by Sharing Becof</h1>
            <p className="text-muted-foreground text-lg mb-8">
              Get a personal link, share it with your network, and earn 8% commission on every order that's
              delivered and paid for — paid straight to M-Pesa, no cap on how much you can earn.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {affiliateLoading ? (
                <Button size="lg" disabled className="gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</Button>
              ) : (
                <Link to={ctaHref}>
                  <Button size="lg" className="gap-2 font-semibold">
                    {ctaLabel} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <a href="https://wa.me/254735283397?text=Hi%20Becof!%20I%20have%20a%20question%20about%20the%20affiliate%20program." target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2">
                  <MessageCircle className="h-4 w-4" /> Ask a Question
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-background">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-2">How It Works</h2>
            <p className="text-muted-foreground">Four steps from application to your first payout.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="relative bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <span className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow">
                  {i + 1}
                </span>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it's fair ── */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="max-w-3xl mx-auto bg-card rounded-2xl border border-border p-8 shadow-sm text-center">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">You're only credited for real sales</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Commission is calculated the moment an order is confirmed <strong>delivered and paid for</strong> — never
              on a click, a signup, or an order that later gets cancelled or refunded. What you see in your dashboard
              is what's actually owed to you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-background">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-2">Common Questions</h2>
          </motion.div>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <motion.div key={f.q}
                initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-semibold text-foreground mb-1.5">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            {!affiliateLoading && (
              <Link to={ctaHref}>
                <Button size="lg" className="gap-2 font-semibold">
                  {ctaLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Affiliate;
