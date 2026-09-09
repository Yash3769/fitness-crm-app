import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Plus, Search, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients, type ClientStatus } from "@/lib/queries";
import { initials } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — AI Workout Plan Builder" },
      {
        name: "description",
        content: "Browse client profiles, goals and readiness flags before generating plans.",
      },
      { property: "og:title", content: "Clients — AI Workout Plan Builder" },
      { property: "og:description", content: "Your client roster with goals and training levels." },
    ],
  }),
  component: ClientsPage,
});

const STATUS_TABS = ["all", "pending", "active", "on_hold", "rejected", "archived"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function ClientsPage() {
  const { data: clients, isLoading } = useClients();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<StatusTab>("all");

  const byStatus = (clients ?? []).filter((c) => tab === "all" || c.status === (tab as ClientStatus));
  const filtered = byStatus.filter((c) => c.full_name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <AppShell area="admin"
      title="Clients"
      subtitle="Every profile you manage, with goals and readiness at a glance."
      action={
        <Button asChild size="icon" className="h-10 w-10 rounded-full">
          <Link to="/clients/new" aria-label="Add new client">
            <Plus className="h-5 w-5" />
          </Link>
        </Button>
      }
    >
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients"
          className="h-12 pl-10"
        />
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
              tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground",
            )}
          >
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="text-sm font-semibold">No clients found.</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Add a client profile to start building personalised plans.
            </p>
            <Button asChild className="mt-4">
              <Link to="/clients/new">Add New Client</Link>
            </Button>
          </div>
        )}

        {filtered.map((c) => (
          <Link
            key={c.id}
            to="/clients/$clientId"
            params={{ clientId: c.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {initials(c.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-semibold">
                {c.full_name}
                {c.health_flagged && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {c.fitness_profile?.primary_goal ?? "Goal not set"} ·{" "}
                {c.fitness_profile?.level ?? "Level not set"}
              </p>
            </div>
            <StatusBadge status={c.status} className="shrink-0" />
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
