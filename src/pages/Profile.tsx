import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Camera, Lock, AlertTriangle, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const { user, profile, role, loading, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    farm_location: profile?.farm_location || "",
    farm_size_hectares: profile?.farm_size_hectares ? String(profile.farm_size_hectares) : "",
    bio: profile?.bio || "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [passwords, setPasswords] = useState({ current: "", new_password: "", confirm: "" });

  // Sync form when profile loads
  useState(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        farm_location: profile.farm_location || "",
        farm_size_hectares: profile.farm_size_hectares ? String(profile.farm_size_hectares) : "",
        bio: profile.bio || "",
      });
    }
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
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
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      setAvatarFile(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (passwords.new_password !== passwords.confirm) throw new Error("Passwords do not match");
      if (passwords.new_password.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: passwords.new_password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswords({ current: "", new_password: "", confirm: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deactivateAccount = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("profiles").update({ status: "suspended" }).eq("user_id", user.id);
      if (error) throw error;
      await signOut();
    },
    onSuccess: () => {
      toast({ title: "Account deactivated", description: "Contact an administrator to reactivate your account." });
    },
  });

  if (loading) {
    return <Layout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  if (!user) return <Navigate to="/signin" replace />;

  return (
    <Layout>
      <section className="py-12">
        <div className="container max-w-2xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{role?.replace(/_/g, " ") || "User"}</Badge>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </motion.div>

          {/* Profile Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile Information</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={e => { e.preventDefault(); updateProfile.mutate(); }} className="space-y-4">
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
                    {avatarFile && <p className="text-xs text-muted-foreground mt-1">{avatarFile.name}</p>}
                  </div>
                </div>

                <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Farm Location</Label><Input value={form.farm_location} onChange={e => setForm(f => ({ ...f, farm_location: e.target.value }))} /></div>
                <div><Label>Farm Size (hectares)</Label><Input type="number" value={form.farm_size_hectares} onChange={e => setForm(f => ({ ...f, farm_size_hectares: e.target.value }))} /></div>
                <div><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></div>

                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={e => { e.preventDefault(); changePassword.mutate(); }} className="space-y-4">
                <div><Label>New Password</Label><Input type="password" value={passwords.new_password} onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required minLength={6} /></div>
                <div><Label>Confirm New Password</Label><Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required minLength={6} /></div>
                <Button type="submit" variant="outline" disabled={changePassword.isPending}>
                  {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Deactivate Account */}
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Deactivating your account will prevent you from logging in. Contact an administrator to reactivate.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Deactivate My Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will deactivate your account. You won't be able to log in until an administrator reactivates it.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deactivateAccount.mutate()}>Deactivate</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Profile;
