import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db, fetchProfile, type Profile } from "@/lib/db";

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isStaff: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  profile: null,
  isStaff: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user?.id ?? null;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", userId],
    queryFn: async () => {
      const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r: { role: string }) => r.role);
    },
    enabled: !!userId,
  });

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profile ?? null,
      isStaff: !!roles?.some((r) => r === "admin" || r === "moderator"),
      loading,
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    }),
    [session, profile, roles, loading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
