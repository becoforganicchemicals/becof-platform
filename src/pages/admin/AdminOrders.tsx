import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, ClipboardList, Search, RefreshCw,
  ChevronDown, ChevronUp, Phone, MapPin, Mail,
  Package, Eye,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

/* ─── use your existing DB enum for standard orders ─── */
type OrderStatus = Database["public"]["Enums"]["order_status"];
const ORDER_STATUSES: OrderStatus[] = [
  "received", "processing", "confirmed", "dispatched",
  "out_for_delivery", "delivered", "cancelled", "refunded",
];

/* ─── custom order status is plain text (new table, no enum yet) ─── */
const CUSTOM_STATUSES = ["pending", "reviewing", "ready", "deposit_paid", "fulfilled", "cancelled"];

type Tab = "standard" | "custom";

interface CustomOrder {
  id: string; user_id: string; product_name: string; quantity: number;
  unit?: string; full_name: string; phone: string; email?: string;
  delivery_address: string; city: string; status: string;
  deposit_amount?: number; deposit_paid: boolean;
  mpesa_receipt_number?: string; admin_notes?: string;
  notes?: string; created_at: string;
}

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    received: "bg-blue-100 text-blue-800",
    processing: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    dispatched: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    // custom statuses
    pending: "bg-yellow-100 text-yellow-700",
    reviewing: "bg-orange-100 text-orange-700",
    ready: "bg-teal-100 text-teal-700",
    deposit_paid: "bg-cyan-100 text-cyan-700",
    fulfilled: "bg-emerald-100 text-emerald-700",
    paid: "bg-emerald-100 text-emerald-700",
    awaiting_pin: "bg-yellow-100 text-yellow-700",
  };
  return map[s] || "bg-slate-100 text-slate-600";
};

/* ═══════════════════════════════════════════════════════════════ */
const AdminOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("standard");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* update dialog state */
  const [updateDialog, setUpdateDialog] = useState(false);
  const [selectedCustom, setSelectedCustom] = useState<CustomOrder | null>(null);
  const [newCustomStatus, setNewCustomStatus] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [notifying, setNotifying] = useState(false);

  /* ─── Standard orders query (React Query — same as before) ─── */
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /* ─── Custom orders query ─── */
  const { data: customOrders = [], isLoading: customLoading, refetch: refetchCustom } = useQuery({
    queryKey: ["admin-custom-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomOrder[];
    },
  });

  /* ─── Update standard order status (mutation — same as before) ─── */
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;

      // Trigger email notification
      await supabase.functions.invoke("send-order-email", {
        body: {
          order_id: id,
          order_type: "standard",
          type: "order_status_update",
          status_label: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "Order updated & customer notified ✓" });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  /* ─── Search filters ─── */
  const filteredOrders = orders.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    (o.shipping_address as any)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    (o.shipping_address as any)?.phone?.includes(search)
  );

  const filteredCustom = customOrders.filter(o =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.phone?.includes(search) ||
    o.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  /* ─── Open custom order update dialog ─── */
  const openCustomUpdate = (order: CustomOrder) => {
    setSelectedCustom(order);
    setNewCustomStatus(order.status);
    setAdminNotes(order.admin_notes || "");
    setDepositAmount(order.deposit_amount?.toString() || "");
    setUpdateDialog(true);
  };

  /* ─── Save custom order update ─── */
  const saveCustomUpdate = async () => {
    if (!selectedCustom) return;
    setNotifying(true);

    const updates: any = { status: newCustomStatus, admin_notes: adminNotes };
    if (depositAmount) updates.deposit_amount = Number(depositAmount);

    const { error } = await supabase
      .from("custom_orders")
      .update(updates)
      .eq("id", selectedCustom.id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      setNotifying(false); return;
    }

    // Send appropriate email
    const emailType = newCustomStatus === "ready" ? "custom_order_ready" : "order_status_update";
    await supabase.functions.invoke("send-order-email", {
      body: {
        order_id: selectedCustom.id,
        order_type: "custom",
        type: emailType,
        status_label: newCustomStatus.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        deposit_amount: depositAmount || undefined,
      },
    });

    // Log in-app notification
    if (selectedCustom.user_id) {
      await supabase.from("order_notifications").insert({
        user_id: selectedCustom.user_id,
        order_id: selectedCustom.id,
        order_type: "custom",
        type: "order_status_update",
        message: `Your custom order #${selectedCustom.id.slice(0, 8).toUpperCase()} status: ${newCustomStatus.replace(/_/g, " ")}`,
      });
    }

    toast({ title: "Custom order updated & customer notified ✓" });
    setNotifying(false);
    setUpdateDialog(false);
    queryClient.invalidateQueries({ queryKey: ["admin-custom-orders"] });
  };

  /* ─── Manual email trigger ─── */
  const sendManualEmail = async (order: CustomOrder, type: string) => {
    await supabase.functions.invoke("send-order-email", {
      body: { order_id: order.id, order_type: "custom", type },
    });
    toast({ title: "Email sent to customer ✓" });
  };

  const orderRef = (id: string) => id.slice(0, 8).toUpperCase();

  /* ── Tab pill ── */
  const TabPill = ({ id, label, Icon, count }: { id: Tab; label: string; Icon: React.ElementType; count: number }) => (
    <button
      onClick={() => { setTab(id); setExpandedId(null); }}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id
        ? "bg-emerald-600 text-white shadow-sm"
        : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
        }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${tab === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
        {count}
      </span>
    </button>
  );

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Orders
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {orders.length} standard · {customOrders.length} custom
          </p>
        </div>
        <Button variant="outline" onClick={() => { refetchOrders(); refetchCustom(); }} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* tabs */}
      <div className="flex gap-2">
        <TabPill id="standard" label="Standard Orders" Icon={ShoppingCart} count={orders.length} />
        <TabPill id="custom" label="Custom Orders" Icon={ClipboardList} count={customOrders.length} />
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name, phone, order ID…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ═══════════════ STANDARD ORDERS ═══════════════ */}
      {tab === "standard" && (
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100 py-4">
            <CardTitle className="text-base">Standard Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading && <p className="text-center text-slate-400 py-10 text-sm animate-pulse">Loading…</p>}
            {!ordersLoading && filteredOrders.length === 0 && (
              <p className="text-center text-slate-400 py-10 text-sm">No orders found.</p>
            )}

            {filteredOrders.map(order => {
              const addr = order.shipping_address as any;
              return (
                <div key={order.id} className="border-b border-slate-100 last:border-0">
                  {/* summary row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-slate-700">#{orderRef(order.id)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>
                          {order.status?.replace(/_/g, " ")}
                        </span>
                        {(order as any).payment_status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor((order as any).payment_status)}`}>
                            {(order as any).payment_status?.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {addr?.full_name} · {addr?.phone}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-slate-800">KES {order.total_amount?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString("en-GB")}</p>
                    </div>
                    {expandedId === order.id
                      ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    }
                  </div>

                  {/* expanded detail */}
                  {expandedId === order.id && (
                    <div className="px-5 pb-5 bg-slate-50/60 border-t border-slate-100 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 pt-4">
                        {/* shipping info */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Shipping</p>
                          <div className="space-y-1.5 text-sm text-slate-600">
                            <p className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {addr?.address}, {addr?.city}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {addr?.phone}
                            </p>
                            {(order as any).mpesa_receipt_number && (
                              <p className="text-emerald-600 font-medium text-xs">
                                M-Pesa: {(order as any).mpesa_receipt_number}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* items */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                            Items ({(order as any).order_items?.length || 0})
                          </p>
                          <div className="space-y-1">
                            {(order as any).order_items?.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-sm text-slate-600">
                                <span>{item.product_name} × {item.quantity}</span>
                                <span>KES {item.total_price?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {order.notes && (
                        <p className="text-xs text-slate-500 italic">Notes: {order.notes}</p>
                      )}

                      {/* Status update — keeps your original Select pattern */}
                      <div className="flex items-center gap-3 pt-2 flex-wrap">
                        <label className="text-xs font-medium text-slate-500">Update Status:</label>
                        <Select
                          value={order.status}
                          onValueChange={v => updateOrderStatus.mutate({ id: order.id, status: v as OrderStatus })}
                        >
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map(s => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-slate-400">Customer is emailed on every change.</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ CUSTOM ORDERS ═══════════════ */}
      {tab === "custom" && (
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100 py-4">
            <CardTitle className="text-base">Custom Orders ({filteredCustom.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {customLoading && <p className="text-center text-slate-400 py-10 text-sm animate-pulse">Loading…</p>}
            {!customLoading && filteredCustom.length === 0 && (
              <p className="text-center text-slate-400 py-10 text-sm">No custom orders yet.</p>
            )}

            {filteredCustom.map(order => (
              <div key={order.id} className="border-b border-slate-100 last:border-0">
                <div
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-slate-700">#{orderRef(order.id)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      {order.deposit_paid && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                          Deposit Paid
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {order.full_name} · {order.product_name} × {order.quantity} {order.unit}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {order.deposit_amount && (
                      <p className="font-semibold text-slate-800">
                        Deposit: KES {Number(order.deposit_amount).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  {expandedId === order.id
                    ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  }
                </div>

                {expandedId === order.id && (
                  <div className="px-5 pb-5 bg-slate-50/60 border-t border-slate-100 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Customer</p>
                        <div className="space-y-1.5 text-sm text-slate-600">
                          <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{order.phone}</p>
                          {order.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{order.email}</p>}
                          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{order.delivery_address}, {order.city}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Product</p>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-slate-400" />
                            {order.product_name} × {order.quantity} {order.unit}
                          </p>
                          {order.mpesa_receipt_number && (
                            <p className="text-emerald-600 font-medium text-xs">M-Pesa: {order.mpesa_receipt_number}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {order.notes && <p className="text-xs text-slate-500 italic">Customer notes: {order.notes}</p>}

                    {order.admin_notes && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-700">Admin notes: {order.admin_notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => openCustomUpdate(order)}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Eye className="h-4 w-4" /> Update Order
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendManualEmail(order, "custom_order_ready")}
                        className="gap-1.5"
                      >
                        <Mail className="h-4 w-4" /> Email: Order Ready
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ CUSTOM ORDER UPDATE DIALOG ═══════════════ */}
      <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Update Custom Order #{selectedCustom ? orderRef(selectedCustom.id) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
              <Select value={newCustomStatus} onValueChange={setNewCustomStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deposit — only shown when marking as ready */}
            {newCustomStatus === "ready" && (
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">
                  Deposit Amount (KES) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Customer will be emailed to pay this deposit via M-Pesa.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Admin Notes (internal only)</label>
              <Textarea
                rows={3}
                placeholder="Internal notes not visible to customer…"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              An email notification will automatically be sent to the customer when you save.
            </div>

            <Button
              onClick={saveCustomUpdate}
              disabled={notifying}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {notifying
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving & Notifying…</>
                : "Save & Notify Customer"
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
