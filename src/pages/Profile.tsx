import { useState, useEffect, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
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
  User, Camera, Lock, AlertTriangle, Loader2, Save,
  MapPin, Phone, Sprout, Truck, Building2, Package,
  MessageSquare, ShoppingBag, Smartphone, Gift, Star, Copy, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TestimonialForm from "@/components/TestimonialForm";
import { useLoyaltyPoints, KES_PER_POINT_REDEEMED } from "@/hooks/useLoyaltyPoints";

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

// ─── Custom order deposit payment (M-Pesa) ────────────────────────────────────
const DepositPayment = ({ order, onPaid }: { order: any; onPaid: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(order.phone || "");
  const [status, setStatus] = useState<"idle" | "sending" | "polling" | "failed">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const poll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    const maxAttempts = 20; // ~60s

    pollRef.current = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from("custom_orders")
        .select("deposit_paid, payment_status")
        .eq("id", order.id)
        .single();

      if (data?.deposit_paid) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        toast({ title: "Deposit paid!", description: "Your custom order is confirmed." });
        setOpen(false);
        setStatus("idle");
        onPaid();
      } else if (data?.payment_status === "failed" || data?.payment_status === "cancelled") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setStatus("failed");
      } else if (attempts >= maxAttempts) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        toast({ title: "Payment timeout", description: "If you paid, this will update shortly." });
        setStatus("idle");
      }
    }, 3000);
  };

  const sendRequest = async () => {
    if (!phone) {
      toast({ title: "Enter your M-Pesa phone number", variant: "destructive" });
      return;
    }
    setStatus("sending");
    const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
      body: { phone, amount: order.deposit_amount, order_id: order.id, order_type: "custom" },
    });

    if (error || !data?.success) {
      toast({ title: "Failed to send payment request", description: "Please try again.", variant: "destructive" });
      setStatus("idle");
      return;
    }

    toast({ title: "Check your phone", description: "Enter your M-Pesa PIN to pay the deposit." });
    setStatus("polling");
    poll();
  };

  if (!open) {
    return (
      <Button size="sm" className="mt-2 gap-2" onClick={() => setOpen(true)}>
        <Smartphone className="h-3.5 w-3.5" /> Pay Deposit via M-Pesa
      </Button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
      <Label htmlFor={`deposit-phone-${order.id}`} className="text-xs">M-Pesa Phone Number</Label>
      <Input
        id={`deposit-phone-${order.id}`}
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="07XX XXX XXX"
        disabled={status === "polling" || status === "sending"}
      />
      <Button
        size="sm"
        className="w-full gap-2"
        onClick={sendRequest}
        disabled={status === "sending" || status === "polling"}
      >
        {status === "polling"
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for PIN…</>
          : status === "sending"
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
          : "Send Payment Request"}
      </Button>
      {status === "failed" && (
        <p className="text-xs text-destructive">Payment failed or was cancelled. Try again.</p>
      )}
    </div>
  );
};

// ─── Standard order payment retry (M-Pesa) ────────────────────────────────────
const RetryPayment = ({ order, onPaid }: { order: any; onPaid: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(order.phone_number || order.shipping_address?.phone || "");
  const [status, setStatus] = useState<"idle" | "sending" | "polling" | "failed">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const poll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    const maxAttempts = 20; // ~60s

    pollRef.current = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from("orders")
        .select("payment_status, mpesa_receipt_number")
        .eq("id", order.id)
        .single();

      if (data?.payment_status === "paid") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        toast({ title: "Payment confirmed!", description: `Receipt: ${data.mpesa_receipt_number || "—"}` });
        setOpen(false);
        setStatus("idle");
        onPaid();
      } else if (data?.payment_status === "failed" || data?.payment_status === "cancelled") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setStatus("failed");
      } else if (attempts >= maxAttempts) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        toast({ title: "Payment timeout", description: "If you paid, this will update shortly." });
        setStatus("idle");
      }
    }, 3000);
  };

  const sendRequest = async () => {
    if (!phone) {
      toast({ title: "Enter your M-Pesa phone number", variant: "destructive" });
      return;
    }
    setStatus("sending");
    const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
      body: { phone, amount: order.total_amount, order_id: order.id, order_type: "standard" },
    });

    if (error || !data?.success) {
      toast({ title: "Failed to send payment request", description: "Please try again.", variant: "destructive" });
      setStatus("idle");
      return;
    }

    toast({ title: "Check your phone", description: "Enter your M-Pesa PIN to complete payment." });
    setStatus("polling");
    poll();
  };

  const label = order.payment_status === "awaiting_pin" ? "Resend Payment Request"
    : order.payment_status === "failed" || order.payment_status === "cancelled" ? "Retry Payment"
    : "Pay via M-Pesa";

  if (!open) {
    return (
      <Button size="sm" className="mt-2 gap-2" onClick={() => setOpen(true)}>
        <Smartphone className="h-3.5 w-3.5" /> {label}
      </Button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
      <Label htmlFor={`retry-phone-${order.id}`} className="text-xs">M-Pesa Phone Number</Label>
      <Input
        id={`retry-phone-${order.id}`}
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="07XX XXX XXX"
        disabled={status === "polling" || status === "sending"}
      />
      <Button
        size="sm"
        className="w-full gap-2"
        onClick={sendRequest}
        disabled={status === "sending" || status === "polling"}
      >
        {status === "polling"
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for PIN…</>
          : status === "sending"
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
          : "Send Payment Request"}
      </Button>
      {status === "failed" && (
        <p className="text-xs text-destructive">Payment failed or was cancelled. Try again.</p>
      )}
    </div>
  );
};

// ─── Review a purchased, delivered order item (earns loyalty points) ─────────
const ReviewItem = ({ item, userId }: { item: any; userId: string }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // undefined = still checking, null = no review yet, object = already reviewed
  const [existing, setExisting] = useState<any>(undefined);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("product_reviews").select("id").eq("order_item_id", item.id).maybeSingle();
      setExisting(data);
    })();
  }, [item.id]);

  const submit = async () => {
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${userId}/${item.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("review-images").upload(path, imageFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        // review-images is a private bucket, so we store the object path and
        // sign it at render time rather than a (non-working) public URL.
        imageUrl = path;
      }
      const { data, error } = await supabase.from("product_reviews").insert({
        product_id: item.product_id,
        user_id: userId,
        order_item_id: item.id,
        rating,
        comment: comment || null,
        image_url: imageUrl,
      }).select("id").single();
      if (error) throw error;
      toast({ title: "Review submitted!", description: "You've earned loyalty points for this review." });
      setExisting(data);
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (existing === undefined) return null;
  if (existing) return <p className="text-xs text-primary mt-1">✓ Reviewed — thanks for the feedback!</p>;

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="mt-1 h-7 gap-1 text-xs" onClick={() => setOpen(true)}>
        <Star className="h-3 w-3" /> Leave a Review
      </Button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Star className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea
        rows={2} placeholder="How was this product?" value={comment}
        onChange={e => setComment(e.target.value)} className="text-xs resize-none"
      />
      <Input
        type="file" accept="image/*" className="text-xs"
        onChange={e => setImageFile(e.target.files?.[0] || null)}
      />
      <p className="text-xs text-muted-foreground">A photo earns extra points.</p>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit Review"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Profile = () => {
  const { user, profile, role, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const forcePassword = searchParams.get("force_password") === "true";
  const mustChangePassword = profile?.must_change_password === true;

  // Shared fields
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    // farmer-specific
    farm_location: profile?.farm_location || "",
    farm_size_hectares: profile?.farm_size_hectares ? String(profile.farm_size_hectares) : "",
    crop_types: Array.isArray(profile?.crop_types) ? profile.crop_types.join(", ") : profile?.crop_types || "",
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
        crop_types: Array.isArray(profile.crop_types) ? profile.crop_types.join(", ") : profile.crop_types || "",
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
        payload.crop_types = form.crop_types ? form.crop_types.split(",").map((s: string) => s.trim()).filter(Boolean) : null;
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

      // Clear must_change_password flag
      if (mustChangePassword && user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("user_id", user.id);
      }
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswords({ new_password: "", confirm: "" });
      // Remove force_password param and redirect
      if (forcePassword) {
        setSearchParams({});
        window.location.href = "/profile";
      }
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

  // ── Forced password change interstitial ──
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
                  <CardDescription className="text-center">
                    Welcome to Becof! For security, please set a new password before continuing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={e => { e.preventDefault(); changePassword.mutate(); }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="force_new_password">New Password</Label>
                      <Input
                        id="force_new_password"
                        type="password"
                        value={passwords.new_password}
                        onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))}
                        required minLength={6}
                        placeholder="Min. 6 characters"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="force_confirm_password">Confirm New Password</Label>
                      <Input
                        id="force_confirm_password"
                        type="password"
                        value={passwords.confirm}
                        onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                        required minLength={6}
                      />
                    </div>
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

  const meta = roleMeta[role || "farmer"] ?? roleMeta.farmer;
  const RoleIcon = meta.icon;
  const isFarmerOrDistributor = role === "farmer" || role === "distributor";

  const avatarSrc = avatarPreview || profile?.avatar_url || undefined;
  const initials = form.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U";

  // ── Tabs available per role ───────────────────────────────────────────────
  const tabs = [
    { value: "profile", label: "Profile", icon: User },
    { value: "orders", label: "My Orders", icon: ShoppingBag },
    { value: "rewards", label: "Rewards", icon: Gift },
    { value: "security", label: "Security", icon: Lock },
    ...(isFarmerOrDistributor
      ? [{ value: "testimonial", label: "My Testimonial", icon: MessageSquare }]
      : []),
    { value: "danger", label: "Danger Zone", icon: AlertTriangle },
  ];

  // ── Loyalty points & referrals ────────────────────────────────────────────
  const { ledger: pointsLedger, balance: pointsBalance, balanceKes: pointsBalanceKes } = useLoyaltyPoints();
  const referralCode = user.id.slice(0, 8).toUpperCase();
  const referralLink = `${window.location.origin}/signin?ref=${referralCode}`;
  const referralPointsEarned = pointsLedger.filter(r => r.type === "referral").reduce((s, r) => s + r.points, 0);
  const referralCount = pointsLedger.filter(r => r.type === "referral").length;

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: "Referral link copied!" });
    } catch {
      toast({ title: "Couldn't copy — copy it manually", variant: "destructive" });
    }
  };

  // ── Order history queries ─────────────────────────────────────────────────
  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["my-orders", user?.id],
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

  const { data: customOrders = [], refetch: refetchCustomOrders } = useQuery({
    queryKey: ["my-custom-orders", user?.id],
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

  return (
    <Layout>
      <section className="py-12 bg-muted/30 min-h-screen">
        <div className="container space-y-8">

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
            <Tabs defaultValue={searchParams.get("tab") || "profile"}>
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

              {/* ── Orders Tab ── */}
              <TabsContent value="orders" className="mt-6 space-y-6">
                {/* Standard Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" /> Standard Orders ({orders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
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
                                <div className="pt-2 border-t border-border mt-2 space-y-2">
                                  {order.order_items.map((item: any) => (
                                    <div key={item.id}>
                                      <p className="text-xs">{item.product_name} × {item.quantity} — KES {item.total_price?.toLocaleString()}</p>
                                      {order.status === "delivered" && <ReviewItem item={item} userId={user!.id} />}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {order.payment_status && order.payment_status !== "paid" && (
                              <RetryPayment order={order} onPaid={() => refetchOrders()} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Custom Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" /> Custom Orders ({customOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No custom orders yet.</p>
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
                            {order.deposit_amount && !order.deposit_paid && (
                              <DepositPayment order={order} onPaid={() => refetchCustomOrders()} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Rewards Tab ── */}
              <TabsContent value="rewards" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" /> Loyalty Points
                    </CardTitle>
                    <CardDescription>Earn 1 point per KES 100 spent — credited once your order is delivered. 1 point = KES {KES_PER_POINT_REDEEMED} off a future order (up to 10% of that order). Points expire 1 year after they're earned.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-3xl font-bold text-primary">{pointsBalance.toLocaleString()} pts</p>
                        <p className="text-sm text-muted-foreground">≈ KES {pointsBalanceKes.toLocaleString()} in discounts</p>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Leave a review on a delivered product for +200 points, or +400 with a photo.
                      </p>
                    </div>

                    {pointsLedger.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</p>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {pointsLedger.slice(0, 20).map(row => (
                            <div key={row.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-1.5">
                              <div>
                                <p className="text-foreground">{row.description || row.type}</p>
                                <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
                              </div>
                              <span className={`font-semibold ${row.points > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                {row.points > 0 ? "+" : ""}{row.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" /> Refer a Friend
                    </CardTitle>
                    <CardDescription>
                      Share your link — when a friend you refer signs up and their first order is delivered, you get 500 points.
                      {referralCount > 0 && ` You've earned ${referralPointsEarned} points from ${referralCount} referral${referralCount === 1 ? "" : "s"} so far.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input readOnly value={referralLink} className="font-mono text-xs" />
                      <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={copyReferralLink}>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
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
