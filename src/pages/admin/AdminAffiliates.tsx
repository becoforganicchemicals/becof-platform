import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone, Users, Search, Loader2, CheckCircle2, XCircle, PauseCircle,
  PlayCircle, Banknote, Settings2, Clock, Wallet,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
  suspended: { label: "Suspended", color: "bg-muted text-muted-foreground border-border" },
};

const AdminAffiliates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewRate, setReviewRate] = useState("8");
  const [reviewNote, setReviewNote] = useState("");

  const [rateTarget, setRateTarget] = useState<any>(null);
  const [rateValue, setRateValue] = useState("");
  const [codeValue, setCodeValue] = useState("");

  const [payoutTarget, setPayoutTarget] = useState<any>(null);
  const [receiptValue, setReceiptValue] = useState("");

  const { data: affiliates = [], isLoading: affiliatesLoading } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliates").select("*").order("applied_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["admin-affiliate-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_commissions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["admin-affiliate-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_payouts").select("*").order("requested_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-affiliate-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, phone");
      if (error) throw error;
      return data;
    },
  });

  const nameFor = (userId: string) => profiles.find(p => p.user_id === userId)?.full_name || `User ${userId.slice(0, 8).toUpperCase()}`;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
    queryClient.invalidateQueries({ queryKey: ["admin-affiliate-commissions"] });
    queryClient.invalidateQueries({ queryKey: ["admin-affiliate-payouts"] });
  };

  // ── Per-affiliate balances ──
  const balanceFor = (affiliateId: string) => {
    const rows = commissions.filter(c => c.affiliate_id === affiliateId);
    return {
      available: rows.filter(c => c.status === "payable" && !c.payout_id).reduce((s, c) => s + Number(c.commission_amount), 0),
      lifetime: rows.filter(c => c.status !== "void").reduce((s, c) => s + Number(c.commission_amount), 0),
      paid: rows.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.commission_amount), 0),
    };
  };

  const pendingApplications = useMemo(() => affiliates.filter(a => a.status === "pending"), [affiliates]);
  const pendingPayouts = useMemo(() => payouts.filter(p => p.status === "pending"), [payouts]);

  const filteredAffiliates = useMemo(() => affiliates
    .filter(a => a.status !== "pending")
    .filter(a => {
      const q = search.toLowerCase();
      return !q || nameFor(a.user_id).toLowerCase().includes(q) || (a.code || "").toLowerCase().includes(q) || (a.business_name || "").toLowerCase().includes(q);
    }),
  [affiliates, search, profiles]);

  const stats = useMemo(() => ({
    total: affiliates.filter(a => a.status === "approved").length,
    pendingApps: pendingApplications.length,
    pendingPayoutAmount: pendingPayouts.reduce((s, p) => s + Number(p.amount), 0),
    paidLifetime: commissions.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.commission_amount), 0),
  }), [affiliates, pendingApplications, pendingPayouts, commissions]);

  // ── Mutations ──
  const reviewMutation = useMutation({
    mutationFn: async (decision: "approved" | "rejected") => {
      const { error } = await supabase.from("affiliates").update({
        status: decision,
        commission_rate: decision === "approved" ? Number(reviewRate) / 100 : reviewTarget.commission_rate,
        admin_note: reviewNote.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user!.id,
      }).eq("id", reviewTarget.id);
      if (error) throw error;
    },
    onSuccess: (_data, decision) => {
      toast({ title: decision === "approved" ? "Affiliate approved ✓" : "Application rejected" });
      setReviewTarget(null); setReviewNote("");
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async (affiliate: any) => {
      const newStatus = affiliate.status === "suspended" ? "approved" : "suspended";
      const { error } = await supabase.from("affiliates").update({ status: newStatus }).eq("id", affiliate.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast({ title: newStatus === "suspended" ? "Affiliate suspended" : "Affiliate reactivated" });
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRateMutation = useMutation({
    mutationFn: async () => {
      const rate = Number(rateValue) / 100;
      if (!rate || rate <= 0 || rate > 0.5) throw new Error("Enter a commission rate between 0 and 50%");
      const updates: any = { commission_rate: rate };
      if (codeValue.trim() && codeValue.trim().toUpperCase() !== rateTarget.code) {
        updates.code = codeValue.trim().toUpperCase();
      }
      const { error } = await supabase.from("affiliates").update(updates).eq("id", rateTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Affiliate updated ✓" });
      setRateTarget(null);
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message.includes("duplicate") ? "That code is already taken" : e.message, variant: "destructive" }),
  });

  const processPayoutMutation = useMutation({
    mutationFn: async (decision: "completed" | "failed") => {
      const { error } = await supabase.from("affiliate_payouts").update({
        status: decision,
        mpesa_receipt: decision === "completed" ? receiptValue.trim() || null : null,
        processed_at: new Date().toISOString(),
        processed_by: user!.id,
      }).eq("id", payoutTarget.id);
      if (error) throw error;
    },
    onSuccess: (_data, decision) => {
      toast({ title: decision === "completed" ? "Payout marked completed ✓" : "Payout marked failed" });
      setPayoutTarget(null); setReceiptValue("");
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Megaphone className="h-5 w-5 text-primary" /> Affiliate Program
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Commission is only ever awarded once an order is delivered and paid for — never on a click or a refunded sale.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Affiliates", value: stats.total, icon: Users, color: "bg-primary/10 border-primary/30 text-primary" },
          { label: "Pending Applications", value: stats.pendingApps, icon: Clock, color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Pending Payouts", value: `KES ${stats.pendingPayoutAmount.toLocaleString()}`, icon: Banknote, color: "bg-muted/50 border-border text-foreground" },
          { label: "Paid Out (Lifetime)", value: `KES ${stats.paidLifetime.toLocaleString()}`, icon: Wallet, color: "bg-muted/50 border-border text-foreground" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="flex items-center gap-1.5 mb-1"><s.icon className="h-3.5 w-3.5" /><p className="text-xs font-medium">{s.label}</p></div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Pending applications ── */}
      {pendingApplications.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Pending Applications ({pendingApplications.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {pendingApplications.map(a => (
              <div key={a.id} className="p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{nameFor(a.user_id)}{a.business_name && ` — ${a.business_name}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">M-Pesa: {a.mpesa_phone || "—"} · Applied {new Date(a.applied_at).toLocaleDateString("en-GB")}</p>
                  {a.application_note && <p className="text-xs text-muted-foreground mt-1.5 max-w-lg">{a.application_note}</p>}
                </div>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setReviewTarget(a); setReviewRate("8"); setReviewNote(""); }}>
                  <Settings2 className="h-3.5 w-3.5" /> Review
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pending payouts ── */}
      {pendingPayouts.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Payout Requests ({pendingPayouts.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {pendingPayouts.map(p => {
              const affiliate = affiliates.find(a => a.id === p.affiliate_id);
              return (
                <div key={p.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{affiliate ? nameFor(affiliate.user_id) : "—"} · KES {Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">To {p.mpesa_phone} · Requested {new Date(p.requested_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setPayoutTarget(p); setReceiptValue(""); }}>
                    <Banknote className="h-3.5 w-3.5" /> Process
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── All affiliates ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-semibold text-sm">All Affiliates</h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search by name, code, business…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        {affiliatesLoading ? (
          <div className="py-10 text-center text-muted-foreground text-sm"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading…</div>
        ) : filteredAffiliates.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No affiliates yet.</p>
        ) : (
          <div className="divide-y divide-border max-h-[32rem] overflow-y-auto">
            {filteredAffiliates.map(a => {
              const meta = STATUS_META[a.status] ?? STATUS_META.approved;
              const bal = balanceFor(a.id);
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{nameFor(a.user_id)}{a.business_name && ` — ${a.business_name}`}</p>
                      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Code <span className="font-mono">{a.code}</span> · {(a.commission_rate * 100).toFixed(0)}% commission · KES {bal.lifetime.toLocaleString()} lifetime
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-primary text-sm">KES {bal.available.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">available</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setRateTarget(a); setRateValue((a.commission_rate * 100).toString()); setCodeValue(a.code || ""); }}>
                      <Settings2 className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {a.status !== "rejected" && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toggleSuspendMutation.mutate(a)} disabled={toggleSuspendMutation.isPending}>
                        {a.status === "suspended" ? <><PlayCircle className="h-3.5 w-3.5" /> Reactivate</> : <><PauseCircle className="h-3.5 w-3.5" /> Suspend</>}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Review application dialog ── */}
      <Dialog open={!!reviewTarget} onOpenChange={o => !o && setReviewTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Review Application — {reviewTarget && nameFor(reviewTarget.user_id)}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Commission Rate (%, if approving)</Label>
              <Input type="number" min={0} max={50} value={reviewRate} onChange={e => setReviewRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note (visible to the applicant)</Label>
              <Textarea rows={2} value={reviewNote} onChange={e => setReviewNote(e.target.value)} className="resize-none" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="gap-1.5" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate("rejected")}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button className="gap-1.5" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate("approved")}>
              {reviewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit rate/code dialog ── */}
      <Dialog open={!!rateTarget} onOpenChange={o => !o && setRateTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Affiliate — {rateTarget && nameFor(rateTarget.user_id)}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Commission Rate (%)</Label>
              <Input type="number" min={0} max={50} value={rateValue} onChange={e => setRateValue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Affiliate Code</Label>
              <Input value={codeValue} onChange={e => setCodeValue(e.target.value.toUpperCase())} className="font-mono" />
            </div>
            <Button className="w-full gap-2" disabled={updateRateMutation.isPending} onClick={() => updateRateMutation.mutate()}>
              {updateRateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />} Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Process payout dialog ── */}
      <Dialog open={!!payoutTarget} onOpenChange={o => !o && setPayoutTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Process Payout — KES {payoutTarget && Number(payoutTarget.amount).toLocaleString()}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Send KES {payoutTarget && Number(payoutTarget.amount).toLocaleString()} to {payoutTarget?.mpesa_phone} via M-Pesa, then mark it completed with the receipt number.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">M-Pesa Receipt Number (if completed)</Label>
              <Input value={receiptValue} onChange={e => setReceiptValue(e.target.value)} placeholder="e.g. QGH7X8Y2ZP" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="gap-1.5" disabled={processPayoutMutation.isPending} onClick={() => processPayoutMutation.mutate("failed")}>
              <XCircle className="h-3.5 w-3.5" /> Mark Failed
            </Button>
            <Button className="gap-1.5" disabled={processPayoutMutation.isPending} onClick={() => processPayoutMutation.mutate("completed")}>
              {processPayoutMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAffiliates;
