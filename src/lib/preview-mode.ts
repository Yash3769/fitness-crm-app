export type AppRole = "admin" | "client";

/**
 * Local-only "preview mode": lets you jump straight into either dashboard on this machine, with
 * no Supabase account or network call involved. Only ever active in dev builds (stripped out of
 * production) so it can never become a real login bypass once deployed.
 */
const PREVIEW_ROLE_KEY = "fitness_crm_preview_role";

export const PREVIEW_USER_ID: Record<AppRole, string> = {
  admin: "preview-admin",
  client: "preview-client",
};

export function getPreviewRole(): AppRole | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const v = window.localStorage.getItem(PREVIEW_ROLE_KEY);
  return v === "admin" || v === "client" ? v : null;
}

export function setPreviewRole(role: AppRole) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
}

export function clearPreviewRole() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREVIEW_ROLE_KEY);
}
