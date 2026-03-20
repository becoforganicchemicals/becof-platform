import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Highest-privilege role wins when a user has multiple rows in user_roles.
// This makes the system resilient to DB triggers that insert duplicate "farmer" rows.
const ROLE_PRIORITY: AppRole[] = ["super_admin", "admin", "distributor", "farmer"];

const pickHighestRole = (roles: AppRole[]): AppRole | null => {
  if (!roles.length) return null;
  return [...roles].sort(
    (a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b)
  )[0];
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSuspended: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  profile: null,
  signOut: async () => { },
  isAdmin: false,
  isSuperAdmin: false,
  isSuspended: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(null);

  const fetchUserData = async (userId: string) => {
    console.debug("[Auth] fetchUserData started for user:", userId);

    // Await role fetch — critical for app routing logic
    const roleRes = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleRes.error) {
      console.error("[Auth] Role fetch error:", roleRes.error.message);
    } else if (roleRes.data && roleRes.data.length > 0) {
      const roles = roleRes.data.map((r) => r.role);
      const best = pickHighestRole(roles);
      console.debug("[Auth] Roles in DB:", roles, "→ using:", best);
      setRole(best);
    } else {
      console.warn("[Auth] No role rows found for user:", userId);
    }

    // Fire-and-forget profile fetch — does not block loading
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("[Auth] Profile fetch error:", error.message);
        } else if (data) {
          setProfile(data);
        }
      });
  };

  useEffect(() => {
    // `loading` stays true until the first auth event fully resolves (including
    // the role fetch). This prevents route guards from ever seeing the broken
    // state: (user=set, role=null, loading=false).
    let initialised = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug("[Auth] onAuthStateChange event:", event, "user:", session?.user?.id ?? "none");

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch role on every event that carries a user — this covers the
          // expired-token scenario where Supabase fires INITIAL_SESSION(null)
          // then TOKEN_REFRESHED(valid session). Skipping TOKEN_REFRESHED would
          // leave role=null forever after a token expiry.
          try {
            await fetchUserData(session.user.id);
          } catch (err) {
            console.error("[Auth] fetchUserData threw:", err);
            // Don't let a network error freeze loading=true
          }
        } else {
          setRole(null);
          setProfile(null);
        }

        // Release loading gate on the first event only. Subsequent events
        // (TOKEN_REFRESHED etc.) update state without touching loading.
        if (!initialised) {
          initialised = true;
          console.debug("[Auth] loading → false (event:", event + ")");
          setLoading(false);
        }
      }
    );

    // Safety fallback: release loading if there is no session and the
    // subscription somehow never fires the initial event.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !initialised) {
        initialised = true;
        console.debug("[Auth] loading → false (no session fallback)");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    console.debug("[Auth] signOut initiated");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("[Auth] signOut error:", error.message);
    } finally {
      // Always clear local state — even if the Supabase call fails
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      console.debug("[Auth] Local auth state cleared");
    }
  };

  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";
  const isSuspended = profile?.status === "suspended";

  return (
    <AuthContext.Provider value={{ user, session, loading, role, profile, signOut, isAdmin, isSuperAdmin, isSuspended }}>
      {children}
    </AuthContext.Provider>
  );
};
