import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShoppingCart, Users, Bell, Activity, BarChart3, LogOut, Shield, ShieldCheck, ArrowLeft, Ban } from "lucide-react";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminNotifications from "./AdminNotifications";
import AdminActivityLogs from "./AdminActivityLogs";
import AdminAnalytics from "./AdminAnalytics";
import AdminUsers from "./AdminUsers";
import AdminPermissions from "./AdminPermissions";

const AdminDashboard = () => {
  const { user, isAdmin, isSuperAdmin, isSuspended, loading, signOut, role } = useAuth();
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
          <Link to="/">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Website</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Website
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-heading font-bold text-lg">Becof Admin</h1>
            <p className="text-xs text-muted-foreground capitalize">{role} · {user.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </header>

      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full mb-6 ${isSuperAdmin ? "grid-cols-4 lg:grid-cols-7" : "grid-cols-3 lg:grid-cols-5"}`}>
            <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Analytics</span></TabsTrigger>
            <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" /><span className="hidden sm:inline">Products</span></TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">Orders</span></TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Alerts</span></TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="permissions" className="gap-2"><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Permissions</span></TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /><span className="hidden sm:inline">Users</span></TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="logs" className="gap-2"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Audit</span></TabsTrigger>}
          </TabsList>

          <TabsContent value="analytics"><AdminAnalytics /></TabsContent>
          <TabsContent value="products"><AdminProducts /></TabsContent>
          <TabsContent value="orders"><AdminOrders /></TabsContent>
          <TabsContent value="notifications"><AdminNotifications /></TabsContent>
          {isSuperAdmin && <TabsContent value="permissions"><AdminPermissions /></TabsContent>}
          {isSuperAdmin && <TabsContent value="users"><AdminUsers /></TabsContent>}
          {isSuperAdmin && <TabsContent value="logs"><AdminActivityLogs /></TabsContent>}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
