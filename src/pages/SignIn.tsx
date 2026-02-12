import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Leaf, Mail, Lock, User, Tractor, Truck, GraduationCap } from "lucide-react";

const roles = [
  { id: "farmer", label: "Farmer", icon: Tractor },
  { id: "distributor", label: "Distributor", icon: Truck },
  { id: "expert", label: "Expert", icon: GraduationCap },
];

const SignIn = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState("farmer");

  return (
    <Layout>
      <section className="py-16 min-h-[80vh] flex items-center">
        <div className="container max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <Leaf className="h-10 w-10 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" ? "Sign in to your Becof account" : "Join the sustainable agriculture revolution"}
              </p>
            </div>

            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              {mode === "register" && (
                <>
                  <Input placeholder="Full Name" className="h-11" />
                  <div>
                    <label className="text-sm font-medium mb-2 block">I am a:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                            role === r.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <r.icon className="h-5 w-5" />
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Email Address" type="email" className="pl-10 h-11" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Password" type="password" className="pl-10 h-11" />
              </div>
              <Button className="w-full h-11" size="lg">
                {mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="text-center mt-6">
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign In"}
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default SignIn;
