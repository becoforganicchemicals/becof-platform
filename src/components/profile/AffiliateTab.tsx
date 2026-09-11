import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliate, MIN_PAYOUT_KES } from "@/hooks/useAffiliate";
import { buildAffiliateLink } from "@/lib/affiliate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone, Copy, Loader2, Banknote, Clock, CheckCircle2,
  XCircle, PauseCircle, Wallet, TrendingUp, Sparkles,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Under Review", icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Not Approved", icon: XCircle, color: "bg-red-100 text-red-700 border-red-200" },
  suspended: { label: "Suspended", icon: PauseCircle, color: "bg-muted text-muted-foreground border-border" },
};

const COMMISSION_STATUS_META: Record<string, { label: string; color: string }> = {
  payable: { label: "Payable", color: "text-primary" },
  paid: { label: "Paid", color: "text-emerald-600" },
  void: { label: "Void", color: "text-muted-foreground" },
};

const AffiliateTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { affiliate, commissions, payouts, affiliateLoading, availableBalance, pendingPayoutBalance, paidTotal, lifetimeEarned, refetch } = useAffiliate();

  const [applyOpen, setApplyOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [note, setNote] = useState("");

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutPhone, setPayoutPhone] = useState("");

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!mpesaPhone.trim()) throw new Error("An M-Pesa phone number is required");
      const { error } = await supabase.from("affiliates").insert({
        user_id: user!.id,
        business_name: businessName.trim() || null,
        mpesa_phone: mpesaPhone.trim(),
        application_note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Application submitted", description: "We'll review it within 5–10 business days." });
      refetch();
    },
    onError: (e: Error) => toast({ title: "Couldn't submit application", description: e.message, variant: "destructive" }),
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      if (!payoutPhone.trim()) throw new Error("An M-Pesa phone number is required");
      const { data, error } = await supabase.functions.invoke("request-affiliate-payout", {
        body: { mpesa_phone: payoutPhone.trim() },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Payout request failed");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Payout requested ✓", description: `KES ${Number(data.amount).toLocaleString()} — we'll process it shortly.` });
      setPayoutOpen(false);
      refetch();
    },
    onError: (e: Error) => toast({ title: "Couldn't request payout", description: e.message, variant: "destructive" }),
  });

  if (affiliateLoading) {
    return <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;
  }

  /* ── Not applied yet ── */
  if (!affiliate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Become a Becof Affiliate</CardTitle>
          <CardDescription>
            Share Becof products with your network and earn a commission on every order that's delivered and paid for —
            no cap, paid out to M-Pesa once you clear KES {MIN_PAYOUT_KES.toLocaleString()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!applyOpen ? (
            <Button className="gap-2" onClick={() => setApplyOpen(true)}>
              <Sparkles className="h-4 w-4" /> Apply to Become an Affiliate
            </Button>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-xs">Business / Brand Name (optional)</Label>
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Green Acres Agrovet" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">M-Pesa Number for Payouts *</Label>
                <Input value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tell us how you plan to promote Becof (optional)</Label>
                <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} className="resize-none" placeholder="e.g. I run a WhatsApp group of 400+ farmers in Nakuru…" />
              </div>
              <div className="flex gap-2">
                <Button disabled={applyMutation.isPending} onClick={() => applyMutation.mutate()} className="gap-2">
                  {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Submit Application
                </Button>
                <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ── Applied, not yet approved ── */
  if (affiliate.status !== "approved") {
    const meta = STATUS_META[affiliate.status] ?? STATUS_META.pending;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Affiliate Application</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full border ${meta.color}`}>
            <meta.icon className="h-4 w-4" /> {meta.label}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {affiliate.status === "pending" && "We typically review applications within 5–10 business days. You'll see your affiliate link and dashboard here once approved."}
            {affiliate.status === "rejected" && "Your application wasn't approved this time."}
            {affiliate.status === "suspended" && "Your affiliate account is currently suspended."}
          </p>
          {affiliate.admin_note && (
            <p className="text-sm text-foreground bg-muted/50 border border-border rounded-lg p-3 mt-3">{affiliate.admin_note}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ── Approved: full dashboard ── */
  const link = buildAffiliateLink(affiliate.code || "");
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Affiliate link copied!" });
    } catch { toast({ title: "Couldn't copy link", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Your Affiliate Link</CardTitle>
          <CardDescription>
            Share this link anywhere — when someone buys through it and their order is delivered and paid for, you earn{" "}
            <strong>{(affiliate.commission_rate * 100).toFixed(0)}%</strong> commission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={link} className="font-mono text-xs" />
            <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Available", value: availableBalance, icon: Wallet, color: "bg-primary/10 border-primary/30 text-primary" },
          { label: "Pending Payout", value: pendingPayoutBalance, icon: Clock, color: "bg-muted/50 border-border text-foreground" },
          { label: "Paid Out", value: paidTotal, icon: Banknote, color: "bg-muted/50 border-border text-foreground" },
          { label: "Lifetime Earned", value: lifetimeEarned, icon: TrendingUp, color: "bg-muted/50 border-border text-foreground" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="flex items-center gap-1.5 mb-1"><s.icon className="h-3.5 w-3.5" /><p className="text-xs font-medium">{s.label}</p></div>
            <p className="text-lg font-bold">KES {s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            {availableBalance >= MIN_PAYOUT_KES
              ? `KES ${availableBalance.toLocaleString()} ready to request.`
              : `Minimum payout is KES ${MIN_PAYOUT_KES.toLocaleString()} (you have KES ${availableBalance.toLocaleString()} available).`}
          </p>
          <Button
            className="gap-2"
            disabled={availableBalance < MIN_PAYOUT_KES}
            onClick={() => { setPayoutPhone(affiliate.mpesa_phone || ""); setPayoutOpen(true); }}
          >
            <Banknote className="h-4 w-4" /> Request Payout
          </Button>
        </CardContent>
      </Card>

      {commissions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Commissions</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
            {commissions.slice(0, 30).map(c => {
              const meta = COMMISSION_STATUS_META[c.status] ?? COMMISSION_STATUS_META.payable;
              return (
                <div key={c.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-1.5">
                  <div>
                    <p className="text-foreground">Order #{c.order_id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} · {meta.label}</p>
                  </div>
                  <span className={`font-semibold ${meta.color}`}>KES {Number(c.commission_amount).toLocaleString()}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {payouts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payout History</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {payouts.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-1.5">
                <div>
                  <p className="text-foreground">KES {Number(p.amount).toLocaleString()} to {p.mpesa_phone}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className="text-xs font-medium capitalize text-muted-foreground">{p.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Request Payout</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              KES {availableBalance.toLocaleString()} will be requested. We process payouts to M-Pesa manually within a few business days.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">M-Pesa Number</Label>
              <Input value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutOpen(false)}>Cancel</Button>
            <Button disabled={payoutMutation.isPending} onClick={() => payoutMutation.mutate()} className="gap-2">
              {payoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              Confirm Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffiliateTab;
