import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, AlertTriangle } from "lucide-react";

const StatCard = ({ title, value, icon: Icon, subtitle, color = "text-primary" }: any) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-primary/10 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminAnalytics = () => {
  const { data: orders } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["analytics-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role");
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = orders?.reduce((s, o) => s + Number(o.total_amount), 0) || 0;
  const totalOrders = orders?.length || 0;
  const deliveredOrders = orders?.filter(o => o.status === "delivered").length || 0;
  const totalProducts = products?.length || 0;
  const publishedProducts = products?.filter(p => p.is_published).length || 0;
  const lowStock = products?.filter(p => p.stock_quantity <= p.low_stock_threshold).length || 0;
  const totalUsers = users?.length || 0;
  const farmers = users?.filter(u => u.role === "farmer").length || 0;
  const distributors = users?.filter(u => u.role === "distributor").length || 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Dashboard Analytics</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`KES ${totalRevenue.toLocaleString()}`} icon={DollarSign} subtitle={`${totalOrders} orders`} />
        <StatCard title="Orders" value={totalOrders} icon={ShoppingCart} subtitle={`${deliveredOrders} delivered`} />
        <StatCard title="Products" value={totalProducts} icon={Package} subtitle={`${publishedProducts} published`} />
        <StatCard title="Users" value={totalUsers} icon={Users} subtitle={`${farmers} farmers, ${distributors} distributors`} />
      </div>

      {lowStock > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium">{lowStock} product(s) are running low on stock</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent>
            {orders?.slice(0, 5).map(o => (
              <div key={o.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                <span className="text-sm font-medium">KES {Number(o.total_amount).toLocaleString()}</span>
                <span className="text-xs capitalize text-muted-foreground">{o.status.replace(/_/g, " ")}</span>
              </div>
            )) || <p className="text-muted-foreground text-sm">No orders yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">User Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {["farmer", "distributor", "expert", "admin", "super_admin"].map(role => {
              const count = users?.filter(u => u.role === role).length || 0;
              const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
              return (
                <div key={role} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{role.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
