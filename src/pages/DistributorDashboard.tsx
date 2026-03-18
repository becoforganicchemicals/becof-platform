import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, Building2, ShoppingBag, Package, BarChart3,
  MapPin, Phone, Mail, Globe, Loader2, ExternalLink,
  TrendingUp, DollarSign, Clock, CheckCircle,
} from "lucide-react";
import SEO from "@/components/SEO";

const DistributorDashboard = () => {
  const { user, profile, role, loading } = useAuth();

  // ── Partner profile query ──
  const { data: partnerProfile } = useQuery({
    queryKey: ["my-partner-profile", user?.id],
    queryFn: async () => {
      // Find partner profile linked to this user's application
      const { data: app } = await supabase
        .from("distributor_applications")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!app) return null;

      const { data } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("application_id", app.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // ── Orders ──
  const { data: orders = [] } = useQuery({
    queryKey: ["distributor-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: customOrders = [] } = useQuery({
    queryKey: ["distributor-custom-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Available products ──
  const { data: products = [] } = useQuery({
    queryKey: ["distributor-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, images, slug, stock_quantity, short_description, categories(name)")
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // ── Guards ──
  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;
  if (role !== "distributor") return <Navigate to="/profile" replace />;

  // ── Stats ──
  const totalOrders = orders.length + customOrders.length;
  const totalSpent = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter((o: any) => !["delivered", "cancelled", "refunded"].includes(o.status)).length;
  const deliveredOrders = orders.filter((o: any) => o.status === "delivered").length;

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
    { label: "Total Spent", value: `KES ${totalSpent.toLocaleString()}`, icon: DollarSign, color: "text-secondary" },
    { label: "Pending", value: pendingOrders, icon: Clock, color: "text-amber-600" },
    { label: "Delivered", value: deliveredOrders, icon: CheckCircle, color: "text-emerald-600" },
  ];

  return (
    <Layout>
      <SEO title="Distributor Dashboard | Becof" description="Manage your distributor account, orders, and products." url="https://www.becoforganicchemicals.com/distributor" />

      <section className="py-8 bg-muted/30 min-h-screen">
        <div className="container max-w-6xl space-y-6">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  Distributor Dashboard
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Welcome back, {profile?.full_name || profile?.business_name || user.email}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/products">Browse Products</a>
                </Button>
                <Button size="sm" asChild>
                  <a href="/custom-order">Place Custom Order</a>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* ── Stats ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* ── Tabs ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5 hidden sm:block" /> Overview
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm">
                  <ShoppingBag className="h-3.5 w-3.5 hidden sm:block" /> Orders
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-1.5 text-xs sm:text-sm">
                  <Package className="h-3.5 w-3.5 hidden sm:block" /> Products
                </TabsTrigger>
                <TabsTrigger value="business" className="gap-1.5 text-xs sm:text-sm">
                  <Building2 className="h-3.5 w-3.5 hidden sm:block" /> Business
                </TabsTrigger>
              </TabsList>

              {/* ── Overview Tab ── */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Welcome card for new distributors */}
                {totalOrders === 0 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Welcome to Becof's Partner Network! 🌱</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Your distributor account is ready. Here's how to get started:
                          </p>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>✓ <a href="/profile" className="text-primary hover:underline">Complete your profile</a> with business details</p>
                            <p>✓ <a href="/products" className="text-primary hover:underline">Browse our product catalog</a> and place your first order</p>
                            <p>✓ Need bulk quantities? <a href="/custom-order" className="text-primary hover:underline">Place a custom order</a></p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No orders yet. <a href="/products" className="text-primary hover:underline">Browse products</a> to get started.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {orders.slice(0, 5).map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                            <div>
                              <span className="font-mono text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm">KES {order.total_amount?.toLocaleString()}</p>
                              <Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"} className="text-xs">
                                {order.status?.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Orders Tab ── */}
              <TabsContent value="orders" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" /> Standard Orders ({orders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No standard orders yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order: any) => (
                          <div key={order.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
                              <Badge variant={order.status === "delivered" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>
                                {order.status?.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Total: <span className="font-semibold text-foreground">KES {order.total_amount?.toLocaleString()}</span></p>
                              <p>Date: {new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
                              {order.mpesa_receipt_number && <p className="text-primary">M-Pesa: {order.mpesa_receipt_number}</p>}
                              {order.order_items?.length > 0 && (
                                <div className="pt-2 border-t border-border mt-2">
                                  {order.order_items.map((item: any) => (
                                    <p key={item.id} className="text-xs">{item.product_name} × {item.quantity} — KES {item.total_price?.toLocaleString()}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" /> Custom / Bulk Orders ({customOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customOrders.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">No custom orders yet.</p>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/custom-order">Place a Custom Order</a>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customOrders.map((order: any) => (
                          <div key={order.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
                              <Badge variant={order.status === "fulfilled" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>
                                {order.status?.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Product: <span className="font-medium text-foreground">{order.product_name}</span></p>
                              <p>Qty: {order.quantity} {order.unit || ""}</p>
                              <p>Date: {new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
                              {order.deposit_amount && <p>Deposit: KES {order.deposit_amount?.toLocaleString()} {order.deposit_paid ? "✓ Paid" : "— Pending"}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Products Tab ── */}
              <TabsContent value="products" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" /> Available Products ({products.length})
                    </CardTitle>
                    <CardDescription>Browse and order from our catalog</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No products available at the moment.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product: any) => (
                          <a
                            key={product.id}
                            href={`/products/${product.slug}`}
                            className="border border-border rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all group"
                          >
                            <div className="aspect-[4/3] bg-muted overflow-hidden">
                              {product.images?.[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-sm leading-tight mb-1">{product.name}</h4>
                              {product.categories?.name && (
                                <p className="text-xs text-muted-foreground mb-1">{product.categories.name}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-primary">KES {product.price?.toLocaleString()}</span>
                                <Badge variant={product.stock_quantity > 0 ? "secondary" : "destructive"} className="text-xs">
                                  {product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                                </Badge>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Business Tab ── */}
              <TabsContent value="business" className="mt-6 space-y-6">
                {/* Partner profile card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" /> Partner Profile
                    </CardTitle>
                    <CardDescription>
                      {partnerProfile
                        ? "Your business profile as it appears in our partner directory."
                        : "Your partner profile is being set up by our team."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {partnerProfile ? (
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Business Name</p>
                            <p className="text-sm font-semibold">{partnerProfile.display_name}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Partner Type</p>
                            <p className="text-sm capitalize">{partnerProfile.partner_type || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Location</p>
                            <p className="text-sm">{[partnerProfile.town, partnerProfile.county].filter(Boolean).join(", ") || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Phone</p>
                            <p className="text-sm">{partnerProfile.phone || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</p>
                            <p className="text-sm">{partnerProfile.email || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Directory Status</p>
                            <Badge variant={partnerProfile.published ? "default" : "secondary"}>
                              {partnerProfile.published ? "Published" : "Unlisted"}
                            </Badge>
                          </div>
                        </div>

                        {partnerProfile.products?.length > 0 && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Products</p>
                            <div className="flex flex-wrap gap-1.5">
                              {partnerProfile.products.map((p: string) => (
                                <Badge key={p} variant="outline" className="capitalize text-xs">
                                  {p.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {partnerProfile.description && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-1">About</p>
                            <p className="text-sm text-muted-foreground">{partnerProfile.description}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Your partner profile will appear here once our team completes the setup.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Name</p>
                        <p>{profile?.full_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Email</p>
                        <p>{user.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Business Name</p>
                        <p>{profile?.business_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Business Location</p>
                        <p>{profile?.business_location || "—"}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button variant="outline" size="sm" asChild>
                        <a href="/profile">Edit Profile →</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default DistributorDashboard;
