import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { KES_PER_POINT_REDEEMED } from "@/hooks/useLoyaltyPoints";
import { Gift, Users, Search, Loader2, Sparkles, Star, Repeat, Settings2 } from "lucide-react";

const AdminLoyalty = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [adjustUser, setAdjustUser] = useState<{ user_id: string; name: string } | null>(null);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ["admin-loyalty-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-loyalty-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, referred_by_user_id");
      if (error) throw error;
      return data;
    },
  });

  const nameFor = (userId: string) => profiles.find(p => p.user_id === userId)?.full_name || `User ${userId.slice(0, 8).toUpperCase()}`;

  const now = new Date();
  // Redemptions and negative adjustments carry no expiry (expires_at is null)
  // so they always count; earn-type rows only count while unexpired.
  const isValidEarn = (row: any) => !row.expires_at || new Date(row.expires_at) > now;

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const outstanding = ledger.reduce((s, r) => isValidEarn(r) ? s + r.points : s, 0);
    const earned = ledger.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0);
    const redeemed = ledger.filter(r => r.type === "redemption").reduce((s, r) => s + Math.abs(r.points), 0);
    const referralBonuses = ledger.filter(r => r.type === "referral");
    const reviewBonuses = ledger.filter(r => r.type === "review");
    return {
      outstanding, earned, redeemed,
      referralCount: referralBonuses.length,
      referralPoints: referralBonuses.reduce((s, r) => s + r.points, 0),
      reviewCount: reviewBonuses.length,
    };
  }, [ledger]);

  // ── Per-customer balances ──
  const customerRows = useMemo(() => {
    const byUser = new Map<string, { user_id: string; balance: number; earned: number; lastActivity: string }>();
    for (const row of ledger) {
      const existing = byUser.get(row.user_id) || { user_id: row.user_id, balance: 0, earned: 0, lastActivity: row.created_at };
      if (isValidEarn(row)) existing.balance += row.points;
      if (row.points > 0) existing.earned += row.points;
      if (row.created_at > existing.lastActivity) existing.lastActivity = row.created_at;
      byUser.set(row.user_id, existing);
    }
    return Array.from(byUser.values())
      .map(r => ({ ...r, name: nameFor(r.user_id) }))
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.balance - a.balance);
  }, [ledger, profiles, search]);

  // ── Referral leaderboard ──
  const referralRows = useMemo(() => {
    const byReferrer = new Map<string, { count: number; points: number }>();
    for (const row of ledger.filter(r => r.type === "referral")) {
      const existing = byReferrer.get(row.user_id) || { count: 0, points: 0 };
      existing.count += 1;
      existing.points += row.points;
      byReferrer.set(row.user_id, existing);
    }
    return Array.from(byReferrer.entries())
      .map(([user_id, v]) => ({ user_id, name: nameFor(user_id), ...v }))
      .sort((a, b) => b.count - a.count);
  }, [ledger, profiles]);

  const submitAdjustment = useMutation({
    mutationFn: async () => {
      if (!adjustUser) return;
      const points = Number(adjustPoints);
      if (!points || points === 0) throw new Error("Enter a non-zero points amount (use a negative number to deduct)");
      if (!adjustReason.trim()) throw new Error("A reason is required");
      const { data, error } = await supabase.functions.invoke("admin-adjust-points", {
        body: { user_id: adjustUser.user_id, points, description: adjustReason.trim() },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Adjustment failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-loyalty-ledger"] });
      toast({ title: "Points adjusted ✓" });
      setAdjustUser(null); setAdjustPoints(""); setAdjustReason("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Gift className="h-5 w-5 text-primary" /> Loyalty & Referrals
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          100 KES = 1 point earned on delivery · 1 point = KES {KES_PER_POINT_REDEEMED} redeemed · 500 pts per referral
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Points Outstanding", value: stats.outstanding.toLocaleString(), sub: `≈ KES ${(stats.outstanding * KES_PER_POINT_REDEEMED).toLocaleString()} liability`, icon: Sparkles, color: "bg-primary/10 border-primary/30 text-primary" },
          { label: "Total Earned", value: stats.earned.toLocaleString(), sub: "all-time", icon: Gift, color: "bg-muted/50 border-border text-foreground" },
          { label: "Total Redeemed", value: stats.redeemed.toLocaleString(), sub: "all-time", icon: Repeat, color: "bg-muted/50 border-border text-foreground" },
          { label: "Referral Bonuses", value: stats.referralCount, sub: `${stats.referralPoints.toLocaleString()} pts paid`, icon: Users, color: "bg-muted/50 border-border text-foreground" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="flex items-center gap-1.5 mb-1"><s.icon className="h-3.5 w-3.5" /><p className="text-xs font-medium">{s.label}</p></div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs opacity-70 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Customer balances ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-semibold text-sm">Customer Balances</h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        {ledgerLoading ? (
          <div className="py-10 text-center text-muted-foreground text-sm"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading…</div>
        ) : customerRows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No point activity yet.</p>
        ) : (
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {customerRows.map(row => (
              <div key={row.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.earned.toLocaleString()} pts earned all-time · last activity {new Date(row.lastActivity).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-primary">{row.balance.toLocaleString()} pts</p>
                    <p className="text-xs text-muted-foreground">KES {(row.balance * KES_PER_POINT_REDEEMED).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdjustUser({ user_id: row.user_id, name: row.name })}>
                    <Settings2 className="h-3.5 w-3.5" /> Adjust
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Referral leaderboard ── */}
      {referralRows.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Top Referrers</h3>
          </div>
          <div className="divide-y divide-border">
            {referralRows.map(r => (
              <div key={r.user_id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground">{r.count} referral{r.count === 1 ? "" : "s"} · {r.points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent activity ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Recent Activity</h3>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {ledger.slice(0, 40).map(row => (
            <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate">{nameFor(row.user_id)} — {row.description || row.type}</p>
                <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("en-GB")}</p>
              </div>
              <span className={`font-semibold shrink-0 ${row.points > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {row.points > 0 ? "+" : ""}{row.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Adjust dialog ── */}
      <Dialog open={!!adjustUser} onOpenChange={o => !o && setAdjustUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Points — {adjustUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Points (negative to deduct)</Label>
              <Input type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="e.g. 100 or -50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason (required, kept in the ledger)</Label>
              <Textarea rows={2} value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="e.g. Goodwill credit for delayed delivery" className="resize-none" />
            </div>
            <Button className="w-full gap-2" disabled={submitAdjustment.isPending} onClick={() => submitAdjustment.mutate()}>
              {submitAdjustment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              Apply Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLoyalty;
