import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Coach Console — Fitness CRM" },
      { name: "description", content: "Coach dashboard for managing clients and workout plans." },
      { property: "og:title", content: "Coach Console — Fitness CRM" },
      { property: "og:description", content: "Manage clients, requests and plans." },
    ],
  }),
});
