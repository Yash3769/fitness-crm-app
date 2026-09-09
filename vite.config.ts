// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Only set by scripts/build-pages.mjs, for the static GitHub Pages export. Leaves the normal
// dev server and the regular server-rendered build (Cloudflare, etc.) completely untouched.
const isPagesBuild = process.env["BUILD_TARGET"] === "pages";
const PAGES_BASE = "/fitness-crm-app/";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isPagesBuild
      ? {
          // GitHub Pages can only serve static files — no server functions, no SSR. This
          // prerenders one static HTML "shell" that the client-side router takes over from
          // entirely in the browser, instead of relying on a server to render each route.
          spa: { enabled: true },
          router: { basepath: PAGES_BASE.slice(0, -1) },
        }
      : {}),
  },
  // The Cloudflare/Nitro adapter writes the server bundle to its own layout, which conflicts
  // with TanStack Start's built-in SPA prerender step (it expects a plain dist/server/server.js).
  // There's no server to run on GitHub Pages anyway, so skip Nitro entirely for this build.
  ...(isPagesBuild ? { nitro: false } : {}),
  vite: {
    plugins: [mcpPlugin()],
    define: {
      // MOCK_ONLY (preview-db.ts local mock) stays available for dev's "Preview mode" buttons,
      // but is never forced on for the Pages build anymore — that build now talks to the real
      // Supabase project directly (see NO_SERVER below for what's still different about it).
      __MOCK_ONLY__: "false",
      // GitHub Pages has no server at all, so anything that needs one (the coach-account
      // bootstrap / signup server functions) can't be called — the client falls back straight
      // to a plain client-side Supabase signup instead (see NO_SERVER in preview-mode.ts).
      __NO_SERVER__: JSON.stringify(isPagesBuild),
    },
    ...(isPagesBuild ? { base: PAGES_BASE } : {}),
  },
});
