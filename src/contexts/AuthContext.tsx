import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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
  refreshProfile: () => Promise<void>;
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
  refreshProfile: async () => { },
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

  // Tracks whichever user id is "current" as of the most recent auth event,
  // set synchronously (not via state, which only lands after a render) so an
  // in-flight fetchUserData call from a since-superseded session can tell
  // it's stale and bail instead of overwriting the new session's role/profile
  // — matters if a user signs out and a different user signs in again
  // quickly enough that the two fetches overlap.
  const latestUserIdRef = useRef<string | null>(null);

  const fetchUserData = async (userId: string) => {
    console.debug("[Auth] fetchUserData started for user:", userId);

    // Await role fetch — critical for app routing logic
    const roleRes = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (latestUserIdRef.current !== userId) {
      console.debug("[Auth] fetchUserData: stale (role), ignoring for", userId);
      return;
    }

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
        if (latestUserIdRef.current !== userId) {
          console.debug("[Auth] fetchUserData: stale (profile), ignoring for", userId);
          return;
        }
        if (error) {
          console.error("[Auth] Profile fetch error:", error.message);
        } else if (data) {
          setProfile(data);
        }
      });
  };

  useEffect(() => {
    let initialised = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user?.id ?? null;
        latestUserIdRef.current = uid;

        setSession(session);
        setUser(session?.user ?? null);

        if (uid) {
          // Defer DB queries via setTimeout so Supabase has time to set auth
          // headers before the query runs. Without this, INITIAL_SESSION fires
          // before headers are ready, RLS blocks the query, and role stays null.
          setTimeout(() => fetchUserData(uid), 0);
        } else {
          setRole(null);
          setProfile(null);
        }

        // Release loading on the first event. Subsequent events (TOKEN_REFRESHED
        // etc.) update state but don't touch loading.
        if (!initialised) {
          initialised = true;
          setLoading(false);
        }
      }
    );

    // Fallback: if the subscription hasn't fired yet (edge case), resolve
    // loading from getSession so the app doesn't spin forever.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialised) {
        initialised = true;
        const uid = session?.user?.id ?? null;
        latestUserIdRef.current = uid;
        setSession(session);
        setUser(session?.user ?? null);
        if (uid) {
          fetchUserData(uid);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Lets a page that just wrote to `profiles` (name/avatar edit, etc.) pull
  // the fresh row back into this shared context, so anything reading
  // `profile` from here — the navbar, most visibly — doesn't keep showing
  // stale data until an unrelated auth event happens to refire.
  const refreshProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) setProfile(data);
  };

  const signOut = async () => {
    console.debug("[Auth] signOut initiated");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("[Auth] signOut error:", error.message);
    } finally {
      // Always clear local state — even if the Supabase call fails
      latestUserIdRef.current = null;
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
    <AuthContext.Provider value={{ user, session, loading, role, profile, signOut, refreshProfile, isAdmin, isSuperAdmin, isSuspended }}>
      {children}
    </AuthContext.Provider>
  );
};
