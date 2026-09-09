export type AppRole = "admin" | "client";

/**
 * Local-only "preview mode": lets you jump straight into either dashboard, with no Supabase
 * account or network call involved, backed entirely by preview-db.ts's localStorage mock.
 * Available in two cases: dev builds (stripped out of the normal production build, so it can
 * never become a real login bypass once deployed for real), and the static GitHub Pages export
 * (BUILD_TARGET=pages — see vite.config.ts), which has no server/backend at all and so is
 * mock-only unconditionally, in every environment it runs in.
 */
const PREVIEW_ROLE_KEY = "fitness_crm_preview_role";

// Set via vite.config.ts's `define`, true only in the GitHub Pages static build.
declare const __MOCK_ONLY__: boolean;
export const MOCK_ONLY: boolean = __MOCK_ONLY__;

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
