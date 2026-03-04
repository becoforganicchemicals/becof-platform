import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Leaf, Mail, Lock, Tractor, Truck,
  Loader2, ArrowRight, Eye, EyeOff, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getRoleRedirect } from "@/App";

// ── Role options — expert removed ─────────────────────────────────────────────
const ROLES = [
  {
    id: "farmer",
    label: "Farmer",
    icon: Tractor,
    desc: "Buy products, learn sustainable farming, join the community.",
  },
  {
    id: "distributor",
    label: "Distributor",
    icon: Truck,
    desc: "Distribute Becof products and manage your agro-dealer business.",
  },
];

const SignIn = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [selectedRole, setSelectedRole] = useState("farmer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();

  // Already logged in — go to portal
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(getRoleRedirect(role), { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: selectedRole },
            emailRedirectTo: `${window.location.origin}/signin`,
          },
        });
        if (signUpError) throw signUpError;

        // Assign role + create profile if user was auto-confirmed (dev env)
        if (data.user) {
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!existingRole) {
            await supabase.from("user_roles").insert({
              user_id: data.user.id,
              role: selectedRole,
            });
          }

          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from("profiles").insert({
              user_id: data.user.id,
              full_name: fullName,
            });
          }
        }

        setRegistered(true);
      } else {
        // Login — fetch role then redirect
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        toast({ title: "Welcome back!" });
        navigate(getRoleRedirect(roleData?.role ?? null), { replace: true });
      }
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Enter your email address first" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/signin`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent — check your inbox" });
    }
  };

  // ── Email verification sent ───────────────────────────────────────────────
  if (registered) {
    return (
      <Layout>
        <section className="py-16 min-h-[80vh] flex items-center">
          <div className="container max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-10 shadow-lg text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check your email</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                We sent a verification link to <strong>{email}</strong>.
                Click it to activate your account, then come back to sign in.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => { setRegistered(false); setMode("login"); }}
              >
                Back to Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </Layout>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <Layout>
      <section className="py-16 min-h-[80vh] flex items-center">
        <div className="container max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-secondary px-8 py-7 text-primary-foreground">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Leaf className="h-5 w-5" />
                </div>
                <span className="font-semibold tracking-wide text-sm uppercase opacity-90">
                  Becof Organic Chemicals
                </span>
              </div>
              <h1 className="text-2xl font-bold leading-tight">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-primary-foreground/75 text-sm mt-1">
                {mode === "login"
                  ? "Sign in to access your portal"
                  : "Join the sustainable agriculture revolution"}
              </p>
            </div>

            {/* Mode tabs */}
            <div className="flex border-b border-border">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === m
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Register-only fields */}
                  {mode === "register" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="Jane Wanjiku"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>I am registering as a:</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {ROLES.map(r => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setSelectedRole(r.id)}
                              className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedRole === r.id
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:border-primary/40 hover:bg-muted/40"
                                }`}
                            >
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selectedRole === r.id ? "bg-primary/15" : "bg-muted"
                                }`}>
                                <r.icon className={`h-5 w-5 ${selectedRole === r.id ? "text-primary" : "text-muted-foreground"
                                  }`} />
                              </div>
                              <div>
                                <p className={`font-semibold text-sm ${selectedRole === r.id ? "text-primary" : "text-foreground"
                                  }`}>
                                  {r.label}
                                </p>
                                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                                  {r.desc}
                                </p>
                              </div>
                              {selectedRole === r.id && (
                                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9 h-11"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPass ? "text" : "password"}
                        placeholder={mode === "register" ? "Min. 6 characters" : "Your password"}
                        className="pl-9 pr-10 h-11"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPass
                          ? <EyeOff className="h-4 w-4" />
                          : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 gap-2 font-semibold"
                    disabled={loading}
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : mode === "login"
                        ? <><ArrowRight className="h-4 w-4" /> Sign In</>
                        : <><CheckCircle2 className="h-4 w-4" /> Create Account</>
                    }
                  </Button>
                </motion.form>
              </AnimatePresence>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "login" ? "Register" : "Sign In"}
                </button>
              </p>

              <p className="text-center text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Admin or Super Admin accounts are created by the system administrator.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default SignIn;
