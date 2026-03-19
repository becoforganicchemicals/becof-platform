import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, ShoppingCart, Package, Users, AlertTriangle,
  DollarSign, CheckCircle, Clock, Star, Inbox,
  ArrowUpRight, BarChart2, RefreshCw,
} from "lucide-react";

/* ─── helpers ─── */
const fmt = (n: number) => n.toLocaleString("en-KE");
const fmtCurrency = (n: number) =>
  n >= 1_000_000
    ? `KES ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `KES ${(n / 1_000).toFixed(1)}K`
      : `KES ${fmt(n)}`;

const ROLES = [
  { key: "farmer", label: "Farmers", color: "bg-primary" },
  { key: "distributor", label: "Distributors", color: "bg-blue-500" },
  { key: "admin", label: "Admins", color: "bg-violet-500" },
  { key: "super_admin", label: "Super Admins", color: "bg-amber-500" },
];

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-primary/10 text-primary",
  dispatched: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-muted text-muted-foreground",
};

/* ─── mini bar chart from daily data ─── */
const SparkBars = ({ values, color = "bg-primary" }: { values: number[]; color?: string }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} opacity-80 transition-all`}
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
};

/* ─── donut-style ring ─── */
const RingChart = ({ value, total, color }: { value: number; total: number; color: string }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
const AdminAnalytics = () => {

  const { data: orders = [], refetch: refetchOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["analytics-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      return data;
    },
  });

  const { data: customOrders = [] } = useQuery({
    queryKey: ["analytics-custom-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["analytics-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("distributor_applications").select("status");
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["analytics-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_messages").select("read, created_at");
      if (error) throw error;
      return data;
    },
  });

  /* ─── computed metrics ─── */
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  const paidRevenue = orders.filter(o => (o as any).payment_status === "paid").reduce((s, o) => s + Number(o.total_amount), 0);
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const pendingOrders = orders.filter(o => o.status === "received" || o.status === "processing").length;
  const totalProducts = products.length;
  const publishedProds = products.filter(p => p.is_published).length;
  const featuredProds = products.filter(p => (p as any).is_featured).length;
  const lowStock = products.filter(p => p.stock_quantity <= p.low_stock_threshold);
  const totalUsers = users.length;
  const unreadMessages = messages.filter(m => !m.read).length;
  const pendingApps = applications.filter(a => a.status === "pending").length;

  /* ─── last 7 days revenue sparkline ─── */
  const last7Revenue = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const day = d.toISOString().slice(0, 10);
    return orders
      .filter(o => o.created_at?.slice(0, 10) === day)
      .reduce((s, o) => s + Number(o.total_amount), 0);
  });

  const last7Orders = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const day = d.toISOString().slice(0, 10);
    return orders.filter(o => o.created_at?.slice(0, 10) === day).length;
  });

  /* ─── order status breakdown ─── */
  const statusBreakdown = [
    "received", "processing", "confirmed", "dispatched",
    "out_for_delivery", "delivered", "cancelled",
  ].map(s => ({
    status: s,
    count: orders.filter(o => o.status === s).length,
  })).filter(s => s.count > 0);

  const refetchAll = () => { refetchOrders(); refetchProducts(); refetchUsers(); };

  /* ══════════════════════════════════════════════════ RENDER ══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" /> Dashboard Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={refetchAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-border"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Critical alerts ── */}
      {(lowStock.length > 0 || unreadMessages > 0 || pendingApps > 0) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {lowStock.length > 0 && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">{lowStock.length} Low Stock</p>
                <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                  {lowStock.slice(0, 2).map(p => p.name).join(", ")}{lowStock.length > 2 ? ` +${lowStock.length - 2} more` : ""}
                </p>
              </div>
            </div>
          )}
          {unreadMessages > 0 && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Inbox className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-700">{unreadMessages} Unread Message{unreadMessages > 1 ? "s" : ""}</p>
                <p className="text-xs text-blue-400 mt-0.5">Check the inbox to respond.</p>
              </div>
            </div>
          )}
          {pendingApps > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Users className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">{pendingApps} Pending Application{pendingApps > 1 ? "s" : ""}</p>
                <p className="text-xs text-amber-400 mt-0.5">Distributor applications await review.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: fmtCurrency(totalRevenue),
            sub: `${fmtCurrency(paidRevenue)} confirmed paid`,
            icon: DollarSign,
            spark: last7Revenue,
            sparkColor: "bg-primary",
            accent: "from-primary to-secondary",
            textAccent: "text-primary",
          },
          {
            label: "Orders",
            value: fmt(totalOrders),
            sub: `${pendingOrders} pending · ${deliveredOrders} delivered`,
            icon: ShoppingCart,
            spark: last7Orders,
            sparkColor: "bg-blue-400",
            accent: "from-blue-600 to-cyan-500",
            textAccent: "text-blue-600",
          },
          {
            label: "Products",
            value: fmt(totalProducts),
            sub: `${publishedProds} live · ${featuredProds} featured`,
            icon: Package,
            spark: null,
            accent: "from-violet-600 to-purple-500",
            textAccent: "text-violet-600",
          },
          {
            label: "Users",
            value: fmt(totalUsers),
            sub: `${applications.filter(a => a.status === "approved").length} approved distributors`,
            icon: Users,
            spark: null,
            accent: "from-amber-500 to-orange-400",
            textAccent: "text-amber-600",
          },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center shadow-sm`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
              <ArrowUpRight className={`h-4 w-4 ${card.textAccent} opacity-60`} />
            </div>
            <p className="text-2xl font-bold text-foreground leading-none">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{card.sub}</p>
            {card.spark && (
              <div className="mt-3">
                <SparkBars values={card.spark} color={card.sparkColor} />
                <p className="text-xs text-muted-foreground/40 mt-1">Last 7 days</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Middle row: Order status + Custom orders + Messages ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Order status breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" /> Order Status
          </p>
          {totalOrders === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No orders yet.</p>
          ) : (
            <div className="space-y-2.5">
              {statusBreakdown.map(({ status, count }) => {
                const pct = Math.round((count / totalOrders) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-muted-foreground">{status.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-foreground">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom orders */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-violet-600" /> Custom Orders
          </p>
          <div className="space-y-3">
            {[
              { label: "Total", value: customOrders.length, color: "text-foreground" },
              { label: "Pending", value: customOrders.filter(o => o.status === "pending").length, color: "text-yellow-600" },
              { label: "Reviewing", value: customOrders.filter(o => o.status === "reviewing").length, color: "text-blue-600" },
              { label: "Ready", value: customOrders.filter(o => o.status === "ready").length, color: "text-teal-600" },
              { label: "Deposit Paid", value: customOrders.filter(o => o.status === "deposit_paid").length, color: "text-primary" },
              { label: "Fulfilled", value: customOrders.filter(o => o.status === "fulfilled").length, color: "text-primary" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={`font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inbox + Partner Applications */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-blue-600" /> Inbox & Partners
          </p>
          <div className="space-y-3">
            {[
              { label: "Total Messages", value: messages.length, color: "text-foreground" },
              { label: "Unread", value: unreadMessages, color: "text-blue-600" },
              { label: "Total Applicants", value: applications.length, color: "text-foreground" },
              { label: "Pending Review", value: pendingApps, color: "text-amber-600" },
              { label: "Approved", value: applications.filter(a => a.status === "approved").length, color: "text-primary" },
              { label: "Rejected", value: applications.filter(a => a.status === "rejected").length, color: "text-red-500" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={`font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent orders + User distribution ── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Recent orders */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" /> Recent Orders
            </p>
            <p className="text-xs text-muted-foreground">Last {Math.min(orders.length, 8)}</p>
          </div>
          {ordersLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm animate-pulse">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">No orders yet.</div>
          ) : (
            <div className="divide-y divide-border/30">
              {orders.slice(0, 8).map(o => {
                const addr = o.shipping_address as any;
                return (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || "bg-muted text-muted-foreground"}`}>
                          {o.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {addr?.full_name || "Customer"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">KES {Number(o.total_amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-GB")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User distribution */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground mb-5 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" /> User Roles
          </p>

          <div className="space-y-4">
            {ROLES.map(({ key, label, color }) => {
              const count = users.filter(u => u.role === key).length;
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="font-bold text-foreground">{count} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* total users ring */}
          <div className="mt-6 pt-5 border-t border-border/50 flex items-center gap-4">
            <div className="relative">
              <RingChart
                value={users.filter(u => u.role === "farmer" || u.role === "distributor").length}
                total={totalUsers}
                color="#10b981"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-muted-foreground">{totalUsers}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{totalUsers} Total Users</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {users.filter(u => u.role === "farmer").length} farmers ·{" "}
                {users.filter(u => u.role === "distributor").length} distributors
              </p>
            </div>
          </div>

          {/* product health */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Product Health</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <RingChart value={publishedProds} total={totalProducts} color="#8b5cf6" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground">
                    {totalProducts > 0 ? Math.round((publishedProds / totalProducts) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-semibold text-muted-foreground">{publishedProds}</span> published</p>
                <p><span className="font-semibold text-amber-600">{featuredProds}</span> featured</p>
                <p><span className="font-semibold text-red-500">{lowStock.length}</span> low stock</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
