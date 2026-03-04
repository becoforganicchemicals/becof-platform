import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
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
  User, Camera, Lock, AlertTriangle, Loader2, Save,
  MapPin, Phone, Sprout, Truck, Building2, Package,
  MessageSquare, ShoppingBag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TestimonialForm from "@/components/TestimonialForm";

// ─── Role badge config ────────────────────────────────────────────────────────
const roleMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  farmer: { label: "Farmer", color: "bg-green-100 text-green-700 border-green-200", icon: Sprout },
  distributor: { label: "Distributor", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Truck },
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700 border-purple-200", icon: User },
  super_admin: { label: "Super Admin", color: "bg-red-100 text-red-700 border-red-200", icon: User },
};

// ─── Shared field ─────────────────────────────────────────────────────────────
const Field = ({
  label, id, children,
}: { label: string; id?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Profile = () => {
  const { user, profile, role, loading, signOut } = useAuth();
  const { toast } = useToast();

  // Shared fields
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    // farmer-specific
    farm_location: profile?.farm_location || "",
    farm_size_hectares: profile?.farm_size_hectares ? String(profile.farm_size_hectares) : "",
    crop_types: profile?.crop_types || "",          // comma-separated crops
    // distributor-specific
    business_name: profile?.business_name || "",
    business_location: profile?.business_location || "",
    coverage_area: profile?.coverage_area || "",       // counties covered
    years_in_business: profile?.years_in_business ? String(profile.years_in_business) : "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({
    new_password: "", confirm: "",
  });

  // Sync form when profile data loads from auth context
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        farm_location: profile.farm_location || "",
        farm_size_hectares: profile.farm_size_hectares ? String(profile.farm_size_hectares) : "",
        crop_types: profile.crop_types || "",
        business_name: profile.business_name || "",
        business_location: profile.business_location || "",
        coverage_area: profile.coverage_area || "",
        years_in_business: profile.years_in_business ? String(profile.years_in_business) : "",
      });
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  // ── Update profile mutation ──────────────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
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

      const payload: Record<string, unknown> = {
        full_name: form.full_name || null,
        phone: form.phone || null,
        bio: form.bio || null,
        avatar_url: avatarUrl,
      };

      if (role === "farmer") {
        payload.farm_location = form.farm_location || null;
        payload.farm_size_hectares = form.farm_size_hectares ? Number(form.farm_size_hectares) : null;
        payload.crop_types = form.crop_types || null;
      }

      if (role === "distributor") {
        payload.business_name = form.business_name || null;
        payload.business_location = form.business_location || null;
        payload.coverage_area = form.coverage_area || null;
        payload.years_in_business = form.years_in_business ? Number(form.years_in_business) : null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      setAvatarFile(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Change password mutation ─────────────────────────────────────────────
  const changePassword = useMutation({
    mutationFn: async () => {
      if (passwords.new_password !== passwords.confirm)
        throw new Error("Passwords do not match");
      if (passwords.new_password.length < 6)
        throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: passwords.new_password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswords({ new_password: "", confirm: "" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Deactivate mutation ──────────────────────────────────────────────────
  const deactivateAccount = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended" })
        .eq("user_id", user.id);
      if (error) throw error;
      await signOut();
    },
  });

  // ── Guards ───────────────────────────────────────────────────────────────
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

  const meta = roleMeta[role || "farmer"] ?? roleMeta.farmer;
  const RoleIcon = meta.icon;
  const isFarmerOrDistributor = role === "farmer" || role === "distributor";

  const avatarSrc = avatarPreview || profile?.avatar_url || undefined;
  const initials = form.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U";

  // ── Tabs available per role ───────────────────────────────────────────────
  const tabs = [
    { value: "profile", label: "Profile", icon: User },
    { value: "security", label: "Security", icon: Lock },
    ...(isFarmerOrDistributor
      ? [{ value: "testimonial", label: "My Testimonial", icon: MessageSquare }]
      : []),
    { value: "danger", label: "Danger Zone", icon: AlertTriangle },
  ];

  return (
    <Layout>
      <section className="py-12 bg-muted/30 min-h-screen">
        <div className="container max-w-3xl space-y-8">

          {/* ── Header card ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/80 to-secondary/80" />
              <CardContent className="pt-0 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow">
                      <Camera className="h-3 w-3 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  <div className="flex-1 pb-1">
                    <h1 className="text-xl font-bold leading-tight">
                      {form.full_name || "Your Name"}
                    </h1>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                        <RoleIcon className="h-3 w-3" />{meta.label}
                      </span>
                      {form.phone && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{form.phone}
                        </span>
                      )}
                      {role === "farmer" && form.farm_location && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{form.farm_location}
                        </span>
                      )}
                      {role === "distributor" && form.business_location && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />{form.business_location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Tabs ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="profile">
              <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                {tabs.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs sm:text-sm">
                    <t.icon className="h-3.5 w-3.5 hidden sm:block" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ── Profile Tab ── */}
              <TabsContent value="profile" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" /> Personal Information
                    </CardTitle>
                    <CardDescription>Your basic account details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={e => { e.preventDefault(); updateProfile.mutate(); }}
                      className="space-y-4"
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Full Name" id="full_name">
                          <Input id="full_name" value={form.full_name} onChange={set("full_name")} placeholder="Jane Wanjiku" />
                        </Field>
                        <Field label="Phone Number" id="phone">
                          <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="+254 7xx xxx xxx" />
                        </Field>
                      </div>
                      <Field label="Bio" id="bio">
                        <Textarea
                          id="bio"
                          rows={3}
                          value={form.bio}
                          onChange={set("bio")}
                          placeholder="Tell us a little about yourself…"
                          className="resize-none"
                        />
                      </Field>

                      {/* ── Farmer-specific fields ── */}
                      {role === "farmer" && (
                        <div className="pt-4 border-t border-border space-y-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Sprout className="h-4 w-4" /> Farm Details
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Farm Location / County" id="farm_location">
                              <Input id="farm_location" value={form.farm_location} onChange={set("farm_location")} placeholder="e.g. Nakuru County" />
                            </Field>
                            <Field label="Farm Size (hectares)" id="farm_size">
                              <Input id="farm_size" type="number" min="0" step="0.1" value={form.farm_size_hectares} onChange={set("farm_size_hectares")} placeholder="e.g. 5" />
                            </Field>
                          </div>
                          <Field label="Crops / Produce" id="crop_types">
                            <Input id="crop_types" value={form.crop_types} onChange={set("crop_types")} placeholder="e.g. Maize, Beans, Tomatoes" />
                          </Field>
                        </div>
                      )}

                      {/* ── Distributor-specific fields ── */}
                      {role === "distributor" && (
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
                      )}

                      {avatarFile && (
                        <p className="text-xs text-muted-foreground">
                          New photo selected: {avatarFile.name}
                        </p>
                      )}

                      <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                        {updateProfile.isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Save className="h-4 w-4" />}
                        Save Changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Security Tab ── */}
              <TabsContent value="security" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle>
                    <CardDescription>Choose a strong password with at least 6 characters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={e => { e.preventDefault(); changePassword.mutate(); }}
                      className="space-y-4 max-w-sm"
                    >
                      <Field label="New Password" id="new_password">
                        <Input
                          id="new_password"
                          type="password"
                          value={passwords.new_password}
                          onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))}
                          required minLength={6}
                        />
                      </Field>
                      <Field label="Confirm New Password" id="confirm_password">
                        <Input
                          id="confirm_password"
                          type="password"
                          value={passwords.confirm}
                          onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                          required minLength={6}
                        />
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
              </TabsContent>

              {/* ── Testimonial Tab (farmers & distributors only) ── */}
              {isFarmerOrDistributor && (
                <TabsContent value="testimonial" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" /> Share Your Experience
                      </CardTitle>
                      <CardDescription>
                        Tell us how Becof products have impacted your {role === "farmer" ? "farm" : "business"}.
                        Approved testimonials may be featured on our website.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TestimonialForm />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* ── Danger Zone Tab ── */}
              <TabsContent value="danger" className="mt-6">
                <Card className="border-destructive/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" /> Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Deactivating your account will prevent you from logging in. Contact an
                      administrator to reactivate.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Deactivate My Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will suspend your account. You won't be able to log in until an
                            administrator reactivates it. Your orders and data will be preserved.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => deactivateAccount.mutate()}
                          >
                            Yes, deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

export default Profile;
