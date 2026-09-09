import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllProgress, useClients, type ProgressRow } from "@/lib/queries";
import { initials } from "@/lib/domain";
import { formatDate } from "@/lib/scheduling";

export const Route = createFileRoute("/admin/progress")({
  head: () => ({
    meta: [
      { title: "Client progress — Fitness CRM" },
      { name: "description", content: "Weight trends and last-logged progress across your whole client roster." },
      { property: "og:title", content: "Client progress — Fitness CRM" },
      { property: "og:description", content: "Cross-client progress overview." },
    ],
  }),
  component: ProgressOverview,
});

function ProgressOverview() {
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: entries, isLoading: entriesLoading } = useAllProgress();

  const byClient = new Map<string, ProgressRow[]>();
  for (const e of entries ?? []) {
    const list = byClient.get(e.client_id) ?? [];
    list.push(e);
    byClient.set(e.client_id, list);
  }

  const rows = (clients ?? [])
    .filter((c) => c.status === "active" || c.status === "on_hold")
    .map((c) => {
      const list = (byClient.get(c.id) ?? []).filter((e) => e.weight_kg !== null);
      const last = list[list.length - 1];
      const first = list[0];
      const delta = last && first ? Number(last.weight_kg) - Number(first.weight_kg) : null;
      return { client: c, last, delta, count: list.length };
    })
    .sort((a, b) => (b.last?.recorded_at ?? "").localeCompare(a.last?.recorded_at ?? ""));

  const isLoading = clientsLoading || entriesLoading;

  return (
    <AppShell area="admin" title="Progress" subtitle="Weight trends across your active roster.">
      <div className="space-y-2.5">
        {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}

        {!isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="text-sm font-semibold">No progress logged yet.</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Once clients start logging their weight, trends appear here.
            </p>
          </div>
        )}

        {rows.map(({ client, last, delta, count }) => (
          <Link
            key={client.id}
            to="/clients/$clientId"
            params={{ clientId: client.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {initials(client.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-semibold">
                {client.full_name}
                <StatusBadge status={client.status} />
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {last ? `${last.weight_kg} kg on ${formatDate(last.recorded_at)}` : "No weight logged yet"}
                {count > 0 ? ` · ${count} ${count === 1 ? "entry" : "entries"}` : ""}
              </p>
            </div>
            {delta !== null && (
              <span
                className={
                  delta <= 0
                    ? "flex items-center gap-1 text-sm font-semibold text-success"
                    : "flex items-center gap-1 text-sm font-semibold text-warning-foreground"
                }
              >
                {delta <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} kg
              </span>
            )}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
