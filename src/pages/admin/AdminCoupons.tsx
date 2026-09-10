import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminActivity } from "@/lib/audit-logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Tag, Loader2, ToggleLeft, ToggleRight, Percent, DollarSign,
} from "lucide-react";

const emptyForm = {
  code: "", discount_type: "percentage", discount_value: "",
  min_order_amount: "", max_uses: "", expires_at: "", is_active: true,
};

const AdminCoupons = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const isExpired = (c: any) => c.expires_at && new Date(c.expires_at) < now;
  const isExhausted = (c: any) => c.max_uses && c.current_uses >= c.max_uses;

  const upsert = useMutation({
    mutationFn: async (values: typeof emptyForm & { id?: string }) => {
      if (!values.code.trim()) throw new Error("Code is required");
      if (!values.discount_value || Number(values.discount_value) <= 0) throw new Error("Discount value must be greater than 0");
      if (values.discount_type === "percentage" && Number(values.discount_value) > 100) throw new Error("Percentage discount can't exceed 100");

      const payload = {
        code: values.code.trim().toUpperCase(),
        discount_type: values.discount_type,
        discount_value: Number(values.discount_value),
        min_order_amount: values.min_order_amount ? Number(values.min_order_amount) : null,
        max_uses: values.max_uses ? Number(values.max_uses) : null,
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, values) => {
      logAdminActivity({ action: values.id ? "UPDATE" : "INSERT", targetTable: "coupons", targetId: values.id || null, afterData: { code: values.code } });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Coupon saved ✓" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, is_active }) => {
      logAdminActivity({ action: "UPDATE", targetTable: "coupons", targetId: id, afterData: { is_active } });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      logAdminActivity({ action: "DELETE", targetTable: "coupons", targetId: id });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value ?? ""),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : "",
      max_uses: c.max_uses ? String(c.max_uses) : "",
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 10) : "",
      is_active: c.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const confirmDelete = (id: string, code: string) => {
    if (confirm(`Delete coupon "${code}"? This cannot be undone.`)) deleteCoupon.mutate(id);
  };

  const discountLabel = (c: any) => c.discount_type === "percentage" ? `${c.discount_value}% off` : `KES ${Number(c.discount_value).toLocaleString()} off`;

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Tag className="h-5 w-5 text-primary" />
            Coupons
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {coupons.length} total · {coupons.filter(c => c.is_active && !isExpired(c) && !isExhausted(c)).length} usable now
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editing ? <><Edit className="h-4 w-4 text-primary" /> Edit Coupon</> : <><Tag className="h-4 w-4 text-primary" /> New Coupon</>}
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={e => { e.preventDefault(); upsert.mutate({ ...form, id: editing?.id }); }}
              className="space-y-4 pt-1"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Code <span className="text-primary">*</span>
                </Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                  placeholder="e.g. WELCOME10"
                  className="h-10 font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Discount Type</Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (KES)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Value <span className="text-primary">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number" min="0" step="0.01"
                      value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      required
                      placeholder={form.discount_type === "percentage" ? "10" : "500"}
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {form.discount_type === "percentage" ? <Percent className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Min. Order (KES)</Label>
                  <Input
                    type="number" min="0"
                    value={form.min_order_amount}
                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                    placeholder="Optional"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Max Uses</Label>
                  <Input
                    type="number" min="1"
                    value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    placeholder="Unlimited"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expires On</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">Leave empty for no expiry.</p>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive coupons can't be applied at checkout.</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))}
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={upsert.isPending}>
                {upsert.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : editing ? "Update Coupon" : "Create Coupon"
                }
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: coupons.length, color: "bg-muted/50 border-border text-foreground" },
          { label: "Active", value: coupons.filter(c => c.is_active).length, color: "bg-primary/10 border-primary/30 text-primary" },
          { label: "Expired / Used Up", value: coupons.filter(c => isExpired(c) || isExhausted(c)).length, color: "bg-muted/50 border-border text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Coupon list ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Loading coupons…</span>
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
          <Tag className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No coupons yet</p>
          <p className="text-muted-foreground text-sm mt-1">Create your first coupon to get started.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
          {coupons.map(c => {
            const expired = isExpired(c);
            const exhausted = isExhausted(c);
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Tag className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-foreground">{c.code}</span>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{discountLabel(c)}</span>
                    {expired && <span className="text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Expired</span>}
                    {exhausted && <span className="text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Used up</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ""} uses
                    {c.min_order_amount ? ` · min order KES ${Number(c.min_order_amount).toLocaleString()}` : ""}
                    {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-GB")}` : ""}
                  </p>
                </div>

                <button
                  onClick={() => toggleActive.mutate({ id: c.id, is_active: !c.is_active })}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all shrink-0 ${c.is_active
                      ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {c.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {c.is_active ? "Active" : "Inactive"}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirmDelete(c.id, c.code)} className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
