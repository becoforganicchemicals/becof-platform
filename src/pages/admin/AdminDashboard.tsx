import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Camera, Lock, Save, Loader2,
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

const AdminDashboard = () => {
  const { user, isAdmin, isSuperAdmin, isSuspended, loading, signOut, role, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("analytics");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
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

  const mainNav = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "careers", label: "Careers", icon: Briefcase },
  ];

  const superAdminNav = [
    { id: "permissions", label: "Permissions", icon: ShieldCheck },
    { id: "users", label: "Users", icon: Users },
    { id: "logs", label: "Audit Logs", icon: Activity },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "analytics": return <AdminAnalytics />;
      case "categories": return <AdminCategories />;
      case "products": return <AdminProducts />;
      case "orders": return <AdminOrders />;
      case "notifications": return <AdminNotifications />;
      case "careers": return <AdminCareers />;
      case "permissions": return isSuperAdmin ? <AdminPermissions /> : null;
      case "users": return isSuperAdmin ? <AdminUsers /> : null;
      case "logs": return isSuperAdmin ? <AdminActivityLogs /> : null;
      case "profile": return <AdminProfile />;
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
                <p className="text-xs text-muted-foreground capitalize truncate">{role?.replace(/_/g, " ")}</p>
              </div>
            </div>

            {/* User Profile Card */}
            <div
              className={`mx-3 mt-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeTab === "profile" ? "bg-primary/10 border-primary/30" : "border-border hover:bg-muted/50"}`}
              onClick={() => setActiveTab("profile")}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{profile?.full_name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Main Navigation */}
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
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

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
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
            <SidebarTrigger />
            <h2 className="font-semibold capitalize">{activeTab === "profile" ? "My Profile" : activeTab.replace(/_/g, " ")}</h2>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

/** Inline admin profile */
const AdminProfile = () => {
  const { user, profile, role, signOut } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    farm_location: profile?.farm_location || "",
    farm_size_hectares: profile?.farm_size_hectares ? String(profile.farm_size_hectares) : "",
    bio: profile?.bio || "",
  });
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
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile);
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        farm_location: form.farm_location || null,
        farm_size_hectares: form.farm_size_hectares ? Number(form.farm_size_hectares) : null,
        bio: form.bio || null,
        avatar_url: avatarUrl,
      }).eq("user_id", user.id);
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
        <Badge variant="outline" className="capitalize">{role?.replace(/_/g, " ") || "User"}</Badge>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">{form.full_name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary">
                  <Camera className="h-4 w-4" /> Change Photo
                  <Input type="file" accept="image/*" className="hidden" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
                </Label>
              </div>
            </div>
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Farm Location</Label><Input value={form.farm_location} onChange={e => setForm(f => ({ ...f, farm_location: e.target.value }))} /></div>
            <div><Label>Farm Size (hectares)</Label><Input type="number" value={form.farm_size_hectares} onChange={e => setForm(f => ({ ...f, farm_size_hectares: e.target.value }))} /></div>
            <div><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div><Label>New Password</Label><Input type="password" value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={6} /></div>
            <div><Label>Confirm</Label><Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required minLength={6} /></div>
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
