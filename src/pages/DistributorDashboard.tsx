import { useState, useEffect } from "react";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, Building2, ShoppingBag, Package, BarChart3,
  MapPin, Phone, Mail, Loader2,
  TrendingUp, DollarSign, Clock, CheckCircle,
  User, Camera, Lock, AlertTriangle, Save, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TestimonialForm from "@/components/TestimonialForm";
import SEO from "@/components/SEO";

const Field = ({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
    {children}
  </div>
);

const DistributorDashboard = () => {
  const { user, profile, role, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const forcePassword = searchParams.get("force_password") === "true";
  const mustChangePassword = profile?.must_change_password === true;

  // ── Profile form state ──
  const [form, setForm] = useState({
    full_name: "", phone: "", bio: "",
    business_name: "", business_location: "", coverage_area: "", years_in_business: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        business_name: profile.business_name || "",
        business_location: profile.business_location || "",
        coverage_area: profile.coverage_area || "",
        years_in_business: profile.years_in_business ? String(profile.years_in_business) : "",
      });
    }
  }, [profile]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── Partner profile query ──
  const { data: partnerProfile } = useQuery({
    queryKey: ["my-partner-profile", user?.id],
    queryFn: async () => {
      const { data: app } = await supabase
        .from("distributor_applications").select("id").eq("user_id", user!.id).maybeSingle();
      if (!app) return null;
      const { data } = await supabase
        .from("partner_profiles").select("*").eq("application_id", app.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // ── Orders ──
  const { data: orders = [] } = useQuery({
    queryKey: ["distributor-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("*, order_items(*)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: customOrders = [] } = useQuery({
    queryKey: ["distributor-custom-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Products ──
  const { data: products = [] } = useQuery({
    queryKey: ["distributor-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("id, name, price, images, slug, stock_quantity, short_description, categories(name)")
        .eq("is_published", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  // ── Update profile ──
  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        bio: form.bio || null,
        avatar_url: avatarUrl,
        business_name: form.business_name || null,
        business_location: form.business_location || null,
        coverage_area: form.coverage_area || null,
        years_in_business: form.years_in_business ? Number(form.years_in_business) : null,
      }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Profile updated successfully" }); setAvatarFile(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Change password ──
  const changePassword = useMutation({
    mutationFn: async () => {
      if (passwords.new_password !== passwords.confirm) throw new Error("Passwords do not match");
      if (passwords.new_password.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: passwords.new_password });
      if (error) throw error;
      if (mustChangePassword && user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("user_id", user.id);
      }
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswords({ new_password: "", confirm: "" });
      if (forcePassword) { setSearchParams({}); window.location.href = "/distributor"; }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Deactivate ──
  const deactivateAccount = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("profiles").update({ status: "suspended" }).eq("user_id", user.id);
      await signOut();
    },
  });

  // ── Guards ──
  if (loading) {
    return <Layout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }
  if (!user) return <Navigate to="/signin" replace />;
  if (role !== "distributor") return <Navigate to="/profile" replace />;

  // ── Force password change ──
  if (forcePassword || mustChangePassword) {
    return (
      <Layout>
        <section className="py-16 min-h-[80vh] flex items-center">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-center">Change Your Password</CardTitle>
                  <CardDescription className="text-center">Welcome to Becof! For security, please set a new password before continuing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={e => { e.preventDefault(); changePassword.mutate(); }} className="space-y-4">
                    <Field label="New Password" id="force_new_password">
                      <Input id="force_new_password" type="password" value={passwords.new_password}
                        onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={6} placeholder="Min. 6 characters" />
                    </Field>
                    <Field label="Confirm New Password" id="force_confirm_password">
                      <Input id="force_confirm_password" type="password" value={passwords.confirm}
                        onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required minLength={6} />
                    </Field>
                    {passwords.confirm && passwords.new_password !== passwords.confirm && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                    <Button type="submit" className="w-full gap-2" disabled={changePassword.isPending}>
                      {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Set New Password & Continue
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </Layout>
    );
  }

  // ── Stats ──
  const totalOrders = orders.length + customOrders.length;
  const totalSpent = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter((o: any) => !["delivered", "cancelled", "refunded"].includes(o.status)).length;
  const deliveredOrders = orders.filter((o: any) => o.status === "delivered").length;

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
    { label: "Total Spent", value: `KES ${totalSpent.toLocaleString()}`, icon: DollarSign, color: "text-secondary" },
    { label: "Pending", value: pendingOrders, icon: Clock, color: "text-amber-600" },
    { label: "Delivered", value: deliveredOrders, icon: CheckCircle, color: "text-primary" },
  ];

  const avatarSrc = avatarPreview || profile?.avatar_url || undefined;
  const initials = form.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <Layout>
      <SEO title="Distributor Dashboard | Becof" description="Manage your distributor account, orders, and products." url="https://www.becoforganicchemicals.com/distributor" />

      <section className="py-8 bg-muted/30 min-h-screen">
        <div className="container space-y-6">

          {/* ── Header with avatar ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden">
              <div className="bg-primary px-6 py-8 sm:px-8 sm:py-10">
                <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary-foreground/30 shadow-md">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback className="text-2xl bg-primary-foreground/20 text-primary-foreground font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow">
                      <Camera className="h-3.5 w-3.5 text-primary" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <div className="flex-1 pb-1 space-y-1">
                    <h1 className="text-2xl font-bold leading-tight flex items-center gap-2 text-primary-foreground">
                      <Truck className="h-5 w-5 text-primary-foreground/80" />
                      {form.full_name || "Distributor Dashboard"}
                    </h1>
                    <p className="text-sm text-primary-foreground/70">{user.email}</p>
                    {form.business_name && (
                      <p className="text-sm font-medium text-primary-foreground/90 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-primary-foreground/60" />{form.business_name}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                        <Truck className="h-3 w-3" /> Distributor
                      </span>
                      {form.business_location && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary-foreground/70">
                          <MapPin className="h-3 w-3" />{form.business_location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent" asChild><Link to="/products">Browse Products</Link></Button>
                    <Button size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild><Link to="/custom-order">Place Custom Order</Link></Button>
                  </div>
                </div>
              </div>
            </Card>
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
            <Tabs defaultValue="overview" orientation="vertical" className="flex flex-col md:flex-row gap-6">
              {/* Sidebar menu */}
              <TabsList className="flex flex-row md:flex-col md:w-52 shrink-0 h-auto bg-card border border-border rounded-xl p-2 gap-1">
                <TabsTrigger value="overview" className="w-full justify-start gap-2 text-sm px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <BarChart3 className="h-4 w-4" /> Overview
                </TabsTrigger>
                <TabsTrigger value="orders" className="w-full justify-start gap-2 text-sm px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <ShoppingBag className="h-4 w-4" /> Orders
                </TabsTrigger>
                <TabsTrigger value="products" className="w-full justify-start gap-2 text-sm px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Package className="h-4 w-4" /> Products
                </TabsTrigger>
                <TabsTrigger value="business" className="w-full justify-start gap-2 text-sm px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Building2 className="h-4 w-4" /> Business
                </TabsTrigger>
                <TabsTrigger value="profile" className="w-full justify-start gap-2 text-sm px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <User className="h-4 w-4" /> Profile
                </TabsTrigger>
                <TabsTrigger value="testimonial" className="w-full justify-start gap-2 text-sm px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <MessageSquare className="h-4 w-4" /> Testimonial
                </TabsTrigger>
                <TabsTrigger value="security" className="w-full justify-start gap-2 text-sm px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Lock className="h-4 w-4" /> Security
                </TabsTrigger>
              </TabsList>

              {/* Content area */}
              <div className="flex-1 min-w-0">

              {/* ── Overview Tab ── */}
              <TabsContent value="overview" className="space-y-6">
                {totalOrders === 0 && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Welcome to Becof's Partner Network! 🌱</h3>
                          <p className="text-sm text-muted-foreground mb-3">Your distributor account is ready. Here's how to get started:</p>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <p>✓ Go to the <strong>Profile</strong> tab to complete your business details</p>
                            <p>✓ <Link to="/products" className="text-primary hover:underline">Browse our product catalog</Link> and place your first order</p>
                            <p>✓ Need bulk quantities? <Link to="/custom-order" className="text-primary hover:underline">Place a custom order</Link></p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No orders yet. <Link to="/products" className="text-primary hover:underline">Browse products</Link> to get started.</p>
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
              <TabsContent value="orders" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Standard Orders ({orders.length})</CardTitle></CardHeader>
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
                  <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Custom / Bulk Orders ({customOrders.length})</CardTitle></CardHeader>
                  <CardContent>
                    {customOrders.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">No custom orders yet.</p>
                        <Button variant="outline" size="sm" asChild><Link to="/custom-order">Place a Custom Order</Link></Button>
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
              <TabsContent value="products" className="">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Available Products ({products.length})</CardTitle>
                    <CardDescription>Browse and order from our catalog</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No products available at the moment.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product: any) => (
                          <Link key={product.id} to={`/products/${product.slug}`}
                            className="border border-border rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all group">
                            <div className="aspect-[4/3] bg-muted overflow-hidden">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/30" /></div>
                              )}
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-sm leading-tight mb-1">{product.name}</h4>
                              {product.categories?.name && <p className="text-xs text-muted-foreground mb-1">{product.categories.name}</p>}
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-primary">KES {product.price?.toLocaleString()}</span>
                                <Badge variant={product.stock_quantity > 0 ? "secondary" : "destructive"} className="text-xs">
                                  {product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Business Tab ── */}
              <TabsContent value="business" className="space-y-6">
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
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Personal Information</CardTitle>
                    <CardDescription>Your account and business details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={e => { e.preventDefault(); updateProfile.mutate(); }} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Full Name" id="full_name">
                          <Input id="full_name" value={form.full_name} onChange={set("full_name")} placeholder="Jane Wanjiku" />
                        </Field>
                        <Field label="Phone Number" id="phone">
                          <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="+254 7xx xxx xxx" />
                        </Field>
                      </div>
                      <Field label="Bio" id="bio">
                        <Textarea id="bio" rows={3} value={form.bio} onChange={set("bio")} placeholder="Tell us about yourself…" className="resize-none" />
                      </Field>
                      <div className="pt-4 border-t border-border space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Truck className="h-4 w-4" /> Business Details
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Business / Agro-dealer Name" id="business_name">
                            <Input id="business_name" value={form.business_name} onChange={set("business_name")} placeholder="e.g. GreenAcre Agro Supplies" />
                          </Field>
                          <Field label="Business Location" id="business_location">
                            <Input id="business_location" value={form.business_location} onChange={set("business_location")} placeholder="e.g. Eldoret, Uasin Gishu" />
                          </Field>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="Counties / Areas Covered" id="coverage_area">
                            <Input id="coverage_area" value={form.coverage_area} onChange={set("coverage_area")} placeholder="e.g. Uasin Gishu, Trans Nzoia" />
                          </Field>
                          <Field label="Years in Business" id="years_in_business">
                            <Input id="years_in_business" type="number" min="0" value={form.years_in_business} onChange={set("years_in_business")} placeholder="e.g. 4" />
                          </Field>
                        </div>
                      </div>
                      {avatarFile && <p className="text-xs text-muted-foreground">New photo selected: {avatarFile.name}</p>}
                      <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                        {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Testimonial Tab ── */}
              <TabsContent value="testimonial" className="">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Share Your Experience</CardTitle>
                    <CardDescription>Tell us how Becof products have impacted your business. Approved testimonials may be featured on our website.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TestimonialForm />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Security Tab ── */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle>
                    <CardDescription>Choose a strong password with at least 6 characters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={e => { e.preventDefault(); changePassword.mutate(); }} className="space-y-4 max-w-sm">
                      <Field label="New Password" id="new_password">
                        <Input id="new_password" type="password" value={passwords.new_password}
                          onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={6} />
                      </Field>
                      <Field label="Confirm New Password" id="confirm_password">
                        <Input id="confirm_password" type="password" value={passwords.confirm}
                          onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required minLength={6} />
                      </Field>
                      {passwords.confirm && passwords.new_password !== passwords.confirm && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                      <Button type="submit" variant="outline" disabled={changePassword.isPending} className="gap-2">
                        {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Update Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle>
                    <CardDescription>Deactivating your account will prevent you from logging in. Contact an administrator to reactivate.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Deactivate My Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>This will suspend your account. You won't be able to log in until an administrator reactivates it.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deactivateAccount.mutate()}>
                            Yes, deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </TabsContent>

              </div>{/* end content area */}
            </Tabs>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default DistributorDashboard;
