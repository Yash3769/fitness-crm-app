import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Vite's BASE_URL is "/" for the normal build and "/fitness-crm-app/" for the static
    // GitHub Pages export (see vite.config.ts) — the router needs to know which, or it can't
    // reconcile the browser's actual URL with the route tree when served from a subpath.
    basepath: import.meta.env.BASE_URL,
  });

  return router;
};
