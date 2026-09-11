import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Package, ShoppingCart, Users, Bell, Activity, BarChart3, LogOut,
  Shield, ShieldCheck, ArrowLeft, Ban, FolderTree, Briefcase, User,
  Camera, Lock, Save, Loader2, BookOpen, Award, Mail,
  MessageSquare, ShieldAlert, Tag, Gift, Megaphone,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminNotifications from "./AdminNotifications";
import AdminActivityLogs from "./AdminActivityLogs";
import AdminAnalytics from "./AdminAnalytics";
import AdminUsers from "./AdminUsers";
import AdminPermissions from "./AdminPermissions";
import AdminCategories from "./AdminCategories";
import AdminCareers from "./AdminCareers";
import AdminLearn from "./AdminLearn";
import AdminImpact from "./AdminImpact";
import AdminPartners from "./AdminPartners";
import AdminInbox from "./AdminInbox";
import AdminTestimonials from "./AdminTestimonials";
import AdminCoupons from "./AdminCoupons";
import AdminLoyalty from "./AdminLoyalty";
import AdminAffiliates from "./AdminAffiliates";
import AdminWelcome from "@/components/admin/AdminWelcome";

// Map sidebar items to permission names
const NAV_PERMISSION_MAP: Record<string, string> = {
  analytics: "analytics.manage",
  categories: "categories.manage",
  products: "products.manage",
  orders: "orders.manage",
  coupons: "coupons.manage",
  loyalty: "loyalty.manage",
  affiliates: "affiliates.manage",
  notifications: "notifications.manage",
  careers: "careers.manage",
  learn: "learn.manage",
  impact: "impact.manage",
  partners: "partners.manage",
  inbox: "inbox.manage",
  testimonials: "testimonials.manage",
};

const AdminDashboard = () => {
  const { user, isAdmin, isSuperAdmin, isSuspended, loading, signOut, role, profile } = useAuth();
  const { hasPermission } = usePermissions();

  // Build filtered nav once to determine if admin has any permissions
  const allMainNav = useMemo(() => [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "coupons", label: "Coupons", icon: Tag },
    { id: "loyalty", label: "Loyalty", icon: Gift },
    { id: "affiliates", label: "Affiliates", icon: Megaphone },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "careers", label: "Careers", icon: Briefcase },
    { id: "learn", label: "Learn", icon: BookOpen },
    { id: "impact", label: "Impact", icon: Award },
    { id: "partners", label: "Partners", icon: Users },
    { id: "inbox", label: "Inbox", icon: Mail },
    { id: "testimonials", label: "Testimonials", icon: MessageSquare },
  ], []);

  const mainNav = useMemo(() => allMainNav.filter((item) => {
    const permName = NAV_PERMISSION_MAP[item.id];
    return permName ? hasPermission(permName) : true;
  }), [allMainNav, hasPermission]);

  const hasAnyPermission = isSuperAdmin || mainNav.length > 0;
  const [activeTab, setActiveTab] = useState("analytics");

  // Unread notification count for badge
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["admin-unread-notifications"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admin_notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/signin" replace />;
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <Ban className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-destructive">Account Suspended</h1>
          <p className="text-muted-foreground">Your account has been suspended. Contact the administrator for assistance.</p>
          <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Website</Button></Link>
        </div>
      </div>
    );
  }

  // mainNav and allMainNav are now computed above via useMemo

  const superAdminNav = [
    { id: "permissions", label: "Permissions", icon: ShieldCheck },
    { id: "users", label: "Users", icon: Users },
    { id: "logs", label: "Audit Logs", icon: Activity },
  ];

  // Show "Request More Access" for non-super admins who have some permissions
  const showRequestMore = !isSuperAdmin && hasAnyPermission;

  const canAccessTab = (tabId: string): boolean => {
    const permName = NAV_PERMISSION_MAP[tabId];
    if (!permName) return true; // profile, super admin tabs
    return hasPermission(permName);
  };

  const renderContent = () => {
    // Welcome page for admins with no permissions, or explicit request tab
    if (!hasAnyPermission && activeTab !== "profile") {
      return <AdminWelcome mode="welcome" />;
    }
    if (activeTab === "request-access") {
      return <AdminWelcome mode="request-more" />;
    }

    // Check permission for the active tab
    if (!canAccessTab(activeTab) && activeTab !== "profile") {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You don't have permission to access this module. Contact the Super Admin to request access.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case "analytics": return <AdminAnalytics />;
      case "categories": return <AdminCategories />;
      case "products": return <AdminProducts />;
      case "orders": return <AdminOrders />;
      case "coupons": return <AdminCoupons />;
      case "loyalty": return <AdminLoyalty />;
      case "affiliates": return <AdminAffiliates />;
      case "notifications": return <AdminNotifications />;
      case "careers": return <AdminCareers />;
      case "permissions": return isSuperAdmin ? <AdminPermissions /> : null;
      case "users": return isSuperAdmin ? <AdminUsers /> : null;
      case "logs": return isSuperAdmin ? <AdminActivityLogs /> : null;
      case "profile": return <AdminProfile />;
      case "learn": return <AdminLearn />;
      case "impact": return <AdminImpact />;
      case "partners": return <AdminPartners />;
      case "inbox": return <AdminInbox />;
      case "testimonials": return <AdminTestimonials />;
      default: return <AdminAnalytics />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarContent className="flex flex-col h-full">

            {/* Logo */}
            <div className="p-4 flex items-center gap-3 border-b border-border">
              <Shield className="h-6 w-6 text-primary shrink-0" />
              <div className="overflow-hidden">
                <h1 className="font-heading font-bold text-sm truncate">Becof Admin</h1>
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {role?.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            {/* User Profile Card */}
            <div
              className={`mx-3 mt-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeTab === "profile"
                  ? "bg-primary/10 border-primary/30"
                  : "border-border hover:bg-muted/50"
                }`}
              onClick={() => setActiveTab("profile")}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Main Navigation — filtered by permissions */}
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNav.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        className={activeTab === item.id ? "bg-primary/10 text-primary font-medium" : ""}
                      >
                        <item.icon className="h-4 w-4 mr-2 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.id === "notifications" && unreadCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Request More Access — for admins with some permissions */}
            {showRequestMore && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("request-access")}
                        className={activeTab === "request-access" ? "bg-primary/10 text-primary font-medium" : ""}
                      >
                        <ShieldAlert className="h-4 w-4 mr-2 shrink-0" />
                        <span>Request More Access</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Super Admin Navigation */}
            {isSuperAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {superAdminNav.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.id)}
                          className={activeTab === item.id ? "bg-primary/10 text-primary font-medium" : ""}
                        >
                          <item.icon className="h-4 w-4 mr-2 shrink-0" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Bottom Actions */}
            <div className="mt-auto p-3 space-y-2 border-t border-border">
              <Link to="/" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Website
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>

          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
            <SidebarTrigger />
            <h2 className="font-semibold capitalize">
              {(!hasAnyPermission && activeTab !== "profile") || activeTab === "request-access"
                ? "Request Access"
                : activeTab === "profile"
                  ? "My Profile"
                  : activeTab.replace(/_/g, " ")}
            </h2>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};


// ── Admin profile — no farm/distributor fields for admins ────────────────────
const AdminProfile = () => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
  });

  // Sync form when profile data arrives from auth context
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          phone: form.phone || null,
          bio: form.bio || null,
          avatar_url: avatarUrl,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
      setAvatarFile(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.new_password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password changed" });
      setPasswords({ new_password: "", confirm: "" });
    }
    setChangingPw(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="capitalize">
          {role?.replace(/_/g, " ") || "User"}
        </Badge>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={avatarFile ? URL.createObjectURL(avatarFile) : profile?.avatar_url || undefined}
                />
                <AvatarFallback className="text-2xl">
                  {form.full_name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                <Camera className="h-4 w-4" /> Change Photo
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setAvatarFile(e.target.files?.[0] || null)}
                />
              </Label>
            </div>

            <div>
              <Label>Full Name</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                rows={3}
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="resize-none"
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwords.new_password}
                onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <div>
              <Label>Confirm</Label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            {passwords.confirm && passwords.new_password !== passwords.confirm && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
            <Button type="submit" variant="outline" disabled={changingPw}>
              {changingPw && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
