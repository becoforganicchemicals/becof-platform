import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Highest-privilege role wins when a user has multiple rows in user_roles.
// This makes the system resilient to DB triggers that insert "farmer" rows.
const ROLE_PRIORITY: AppRole[] = ["super_admin", "admin", "distributor", "farmer"];

const pickHighestRole = (roles: AppRole[]): AppRole | null => {
  if (!roles.length) return null;
  return roles.sort(
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
  signOut: async () => {},
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

  // Guard against concurrent fetchUserData executions
  const isFetchingRef = useRef(false);

  const fetchUserData = async (userId: string) => {
    if (isFetchingRef.current) {
      console.debug("[Auth] fetchUserData skipped — already in progress for", userId);
      return;
    }
    isFetchingRef.current = true;
    console.debug("[Auth] fetchUserData started for user:", userId);

    try {
      const [roleRes, profileRes] = await Promise.all([
        // Fetch ALL role rows — some environments have a trigger that inserts a
        // default "farmer" row on every sign-in or token event. We pick the
        // highest-privilege role rather than the most-recent one so that a
        // stale "farmer" row can never shadow a legitimate "super_admin" row.
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      // ── Role ─────────────────────────────────────────────────────────────────
      if (roleRes.error) {
        console.error("[Auth] Error fetching roles:", roleRes.error.message, roleRes.error);
        // Do NOT assign a fallback — leave role at its current value
      } else if (roleRes.data && roleRes.data.length > 0) {
        const allRoles = roleRes.data.map((r) => r.role);
        const best = pickHighestRole(allRoles);
        console.debug("[Auth] Roles in DB:", allRoles, "→ using:", best);
        setRole(best);
      } else {
        console.warn("[Auth] No role rows found in user_roles for user:", userId);
        // No row at all — leave role null; do NOT assign "farmer" as fallback
      }

      // ── Profile ──────────────────────────────────────────────────────────────
      if (profileRes.error) {
        console.error("[Auth] Error fetching profile:", profileRes.error.message);
      } else if (profileRes.data) {
        setProfile(profileRes.data);
      }
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    // loading=false is set ONLY after role/profile have been fetched so that
    // route guards never see (user=set, role=null, loading=false) simultaneously.
    let initialised = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug("[Auth] onAuthStateChange event:", event, "user:", session?.user?.id ?? "none");

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Only re-fetch role on events that could change it.
          // TOKEN_REFRESHED is deliberately excluded: it does not change the
          // user's role in the database, and some environments have triggers that
          // insert a new "farmer" row on every refresh — re-fetching here would
          // immediately overwrite a legitimate super_admin role with "farmer".
          const shouldFetchRole = event === "INITIAL_SESSION" || event === "SIGNED_IN";

          if (shouldFetchRole) {
            await fetchUserData(session.user.id);
          } else {
            console.debug("[Auth] Skipping role re-fetch for event:", event);
          }
        } else {
          setRole(null);
          setProfile(null);
        }

        // Release the loading gate on the first event only
        if (!initialised) {
          initialised = true;
          console.debug("[Auth] loading → false (initial resolution via event:", event + ")");
          setLoading(false);
        }
      }
    );

    // Fallback: if no session exists in storage, onAuthStateChange may not fire
    // with INITIAL_SESSION quickly enough; release loading immediately.
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
      if (error) {
        console.error("[Auth] signOut error:", error.message);
      }
    } finally {
      // Always clear local state regardless of whether the Supabase call succeeded
      isFetchingRef.current = false;
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
