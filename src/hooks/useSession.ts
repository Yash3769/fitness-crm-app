import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPreviewRole, setPreviewRole, clearPreviewRole, PREVIEW_USER_ID, type AppRole } from "@/lib/preview-mode";

export type { AppRole };
export { getPreviewRole, setPreviewRole, clearPreviewRole };

function previewUser(role: AppRole): User {
  const id = PREVIEW_USER_ID[role];
  return {
    id,
    email: `${id}@local.test`,
    app_metadata: {},
    user_metadata: { role },
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
  } as User;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewRole, setPreviewRoleState] = useState<AppRole | null>(() => getPreviewRole());

  useEffect(() => {
    if (previewRole) {
      setLoading(false);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [previewRole]);

  // Preview role can be switched from the auth screen in the same tab; re-read on focus.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const sync = () => setPreviewRoleState(getPreviewRole());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const user = previewRole ? previewUser(previewRole) : (session?.user ?? null);

  const roleQuery = useQuery({
    queryKey: ["role", user?.id],
    enabled: !!user && !previewRole,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRole | null> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.role) return data.role as AppRole;
      // First sign-in: claim the role chosen at sign-up (stored in user metadata).
      const wanted = (user!.user_metadata?.["role"] as AppRole | undefined) ?? "client";
      const { data: claimed, error: claimErr } = await supabase.rpc("claim_role", { _role: wanted });
      if (claimErr) throw claimErr;
      return (claimed as AppRole) ?? null;
    },
  });

  if (previewRole) {
    return {
      session: { user } as unknown as Session,
      user,
      loading: false,
      role: previewRole,
      roleLoading: false,
    };
  }

  return {
    session,
    user,
    loading,
    role: roleQuery.data ?? null,
    roleLoading: !!user && roleQuery.isLoading,
  };
}

export function homeForRole(role: AppRole | null | undefined) {
  return role === "admin" ? "/admin" : "/app";
}
