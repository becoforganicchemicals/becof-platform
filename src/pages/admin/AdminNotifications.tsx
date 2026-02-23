import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Check, CheckCheck, Package, ShoppingCart,
  AlertTriangle, Trash2, RefreshCw, Filter, Circle,
  BellOff, Info, Star, Users, Mail,
} from "lucide-react";

/* ─── type config ─── */
const TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}> = {
  new_order: { icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", label: "New Order" },
  low_stock: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", label: "Low Stock" },
  out_of_stock: { icon: Package, color: "text-red-600", bg: "bg-red-50", label: "Out of Stock" },
  payment_received: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50", label: "Payment" },
  order_ready: { icon: Star, color: "text-violet-600", bg: "bg-violet-50", label: "Order Ready" },
  order_updated: { icon: Info, color: "text-slate-600", bg: "bg-slate-50", label: "Order Update" },
  new_application: { icon: Users, color: "text-teal-600", bg: "bg-teal-50", label: "Application" },
  new_message: { icon: Mail, color: "text-indigo-600", bg: "bg-indigo-50", label: "Message" },
};

const DEFAULT_CONFIG = { icon: Bell, color: "text-slate-600", bg: "bg-slate-50", label: "Alert" };

type FilterTab = "all" | "unread" | "orders" | "stock" | "other";

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/* ══════════════════════════════════════════════════════════════════ */
const AdminNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ─── Query ─── */
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  /* ─── Mark single read ─── */
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  /* ─── Mark all read ─── */
  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "All notifications marked as read ✓" });
    },
  });

  /* ─── Mark selected read ─── */
  const markSelectedRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setSelected(new Set());
      toast({ title: `${selected.size} notifications marked as read ✓` });
    },
  });

  /* ─── Delete selected ─── */
  const deleteSelected = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("admin_notifications").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setSelected(new Set());
      toast({ title: "Notifications deleted" });
    },
  });

  /* ─── Computed ─── */
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "orders") return ["new_order", "payment_received", "order_ready", "order_updated"].includes(n.type);
    if (filter === "stock") return ["low_stock", "out_of_stock"].includes(n.type);
    if (filter === "other") return ["new_application", "new_message"].includes(n.type);
    return true;
  });

  /* ─── Selection helpers ─── */
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(n => n.id)));
    }
  };

  /* ── Tab pill ── */
  const TabPill = ({ id, label, count }: { id: FilterTab; label: string; count?: number }) => (
    <button
      onClick={() => { setFilter(id); setSelected(new Set()); }}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === id
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700"
        }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${filter === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
          {count}
        </span>
      )}
    </button>
  );

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-600" />
            Alerts & Notifications
            {unreadCount > 0 && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {notifications.length} total · auto-refreshes every 30s
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-50 border border-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-1.5 text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: notifications.length, color: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Unread", value: unreadCount, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Orders", value: notifications.filter(n => ["new_order", "payment_received", "order_ready", "order_updated"].includes(n.type)).length, color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Stock", value: notifications.filter(n => ["low_stock", "out_of_stock"].includes(n.type)).length, color: "bg-amber-50 border-amber-200 text-amber-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-slate-400" />
        <TabPill id="all" label="All" count={notifications.length} />
        <TabPill id="unread" label="Unread" count={unreadCount} />
        <TabPill id="orders" label="Orders" />
        <TabPill id="stock" label="Stock" />
        <TabPill id="other" label="Other" />
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <p className="text-sm font-medium text-emerald-700 flex-1">
            {selected.size} selected
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            onClick={() => markSelectedRead.mutate([...selected])}
            disabled={markSelectedRead.isPending}
          >
            <Check className="h-3.5 w-3.5" /> Mark Read
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm(`Delete ${selected.size} notification(s)?`)) deleteSelected.mutate([...selected]);
            }}
            disabled={deleteSelected.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </div>
      )}

      {/* ── Notifications feed ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

        {/* select-all header */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <p className="text-xs text-slate-400">
              {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
              {filter !== "all" ? ` in "${filter}"` : ""}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <BellOff className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No notifications here</p>
            <p className="text-slate-300 text-xs mt-1">
              {filter !== "all" ? "Try switching to a different filter." : "You're all caught up!"}
            </p>
          </div>
        )}

        {filtered.map((n, idx) => {
          const cfg = TYPE_CONFIG[n.type] || DEFAULT_CONFIG;
          const Icon = cfg.icon;
          const isSelected = selected.has(n.id);

          return (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-5 py-4 border-b border-slate-50 last:border-0 transition-colors ${!n.is_read ? "bg-emerald-50/30" : "hover:bg-slate-50/40"
                } ${isSelected ? "bg-emerald-50" : ""}`}
            >
              {/* checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(n.id)}
                className="w-4 h-4 accent-emerald-600 rounded mt-1 shrink-0"
              />

              {/* icon */}
              <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className={`h-4 w-4 ${cfg.color}`} />
              </div>

              {/* content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${n.is_read ? "text-slate-700" : "text-slate-900"}`}>
                    {n.title}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {!n.is_read && (
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-slate-300 mt-1.5">{formatTime(n.created_at)}</p>
              </div>

              {/* mark read button */}
              {!n.is_read && (
                <button
                  onClick={() => markRead.mutate(n.id)}
                  title="Mark as read"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0 mt-0.5"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminNotifications;
