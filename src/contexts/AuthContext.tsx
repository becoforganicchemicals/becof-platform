import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

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

  // Guard against concurrent fetchUserData executions (e.g. INITIAL_SESSION + TOKEN_REFRESHED firing together)
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
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      // Role — explicit error handling, no silent fallback
      if (roleRes.error) {
        console.error("[Auth] Error fetching role:", roleRes.error.message, roleRes.error);
        // Do NOT assign a fallback role — leave role as null and surface the error
      } else if (roleRes.data) {
        console.debug("[Auth] Role fetched:", roleRes.data.role);
        setRole(roleRes.data.role);
      } else {
        // No row found — user has no assigned role yet
        console.warn("[Auth] No role row found in user_roles for user:", userId);
        // Still do NOT assign a fallback — leave role null so UI can show appropriate state
      }

      // Profile
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
    // Initialise from persisted session first, then subscribe to changes.
    // loading=false is set ONLY after role/profile have been fetched,
    // preventing the flash where loading=false but role=null causes wrong redirects.
    let initialised = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.debug("[Auth] onAuthStateChange event:", event, "user:", session?.user?.id ?? "none");

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setRole(null);
          setProfile(null);
        }

        // Only flip loading once (first event resolution)
        if (!initialised) {
          initialised = true;
          console.debug("[Auth] loading → false (initial resolution)");
          setLoading(false);
        }
      }
    );

    // getSession resolves immediately from localStorage and triggers onAuthStateChange above.
    // Only needed as a fallback to release loading if the subscription never fires (truly no session).
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
