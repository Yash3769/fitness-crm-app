export type AppRole = "admin" | "client";

/**
 * Local-only "preview mode": lets you jump straight into either dashboard, with no Supabase
 * account or network call involved, backed entirely by preview-db.ts's localStorage mock.
 * Only available in dev builds — stripped out of every production build (including the GitHub
 * Pages export, which talks to the real Supabase project directly) so it can never become a
 * real login bypass once deployed.
 */
const PREVIEW_ROLE_KEY = "fitness_crm_preview_role";

// Both set via vite.config.ts's `define`.
declare const __MOCK_ONLY__: boolean;
declare const __NO_SERVER__: boolean;
export const MOCK_ONLY: boolean = __MOCK_ONLY__;
// True only for the GitHub Pages static export: there's no server to call at all, so auth.tsx
// skips straight to a plain client-side Supabase signup instead of trying a server function.
export const NO_SERVER: boolean = __NO_SERVER__;

const MOCK_MODE_AVAILABLE = import.meta.env.DEV || MOCK_ONLY;

export const PREVIEW_USER_ID: Record<AppRole, string> = {
  admin: "preview-admin",
  client: "preview-client",
};

export function getPreviewRole(): AppRole | null {
  if (!MOCK_MODE_AVAILABLE || typeof window === "undefined") return null;
  const v = window.localStorage.getItem(PREVIEW_ROLE_KEY);
  return v === "admin" || v === "client" ? v : null;
}

export function setPreviewRole(role: AppRole) {
  if (!MOCK_MODE_AVAILABLE || typeof window === "undefined") return;
  window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
}

export function clearPreviewRole() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREVIEW_ROLE_KEY);
}
