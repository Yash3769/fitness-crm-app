import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlanContent } from "@/components/PlanContent";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/useSession";
import { useMyClient, usePlans, useSessions } from "@/lib/queries";
import { formatDate } from "@/lib/scheduling";
import type { WorkoutPlanContent } from "@/lib/plan-types";

export const Route = createFileRoute("/app/plan")({
  head: () => ({
    meta: [
      { title: "My plan — Fitness CRM" },
      { name: "description", content: "Your coach's phase-wise training plan and upcoming sessions." },
      { property: "og:title", content: "My plan — Fitness CRM" },
      { property: "og:description", content: "Full plan detail and session schedule." },
    ],
  }),
  component: ClientPlanPage,
});

function ClientPlanPage() {
  const { user } = useSession();
  const { data: client, isLoading: clientLoading } = useMyClient(user?.id);
  const { data: plans, isLoading: plansLoading } = usePlans(client?.id);
  const plan = (plans ?? []).find((p) => p.status === "published" || p.status === "paused" || p.status === "completed");
  const { data: sessions } = useSessions(client?.id, plan?.id);

  if (clientLoading || plansLoading) {
    return (
      <AppShell area="client" title="My plan">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell area="client" title="My plan">
        <p className="text-sm text-muted-foreground">Your coach hasn't published a plan yet.</p>
      </AppShell>
    );
  }

  const content = plan.content as WorkoutPlanContent;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (sessions ?? []).filter((s) => s.scheduled_date >= today);
  const past = (sessions ?? []).filter((s) => s.scheduled_date < today);

  return (
    <AppShell area="client" title={content.title || plan.title} subtitle={`Version ${plan.version}`}>
      <div className="mb-4">
        <StatusBadge status={plan.status} />
      </div>

      {upcoming.length > 0 && (
        <section className="mb-5 space-y-2">
          <h2 className="eyebrow">Upcoming sessions</h2>
          {upcoming.map((s) => (
            <Link
              key={s.id}
              to="/app/workout/$sessionId"
              params={{ sessionId: s.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {s.day_label} — {s.focus}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(s.scheduled_date)}</p>
              </div>
              <StatusBadge status={s.status} />
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </section>
      )}

      <PlanContent content={content} />

      {past.length > 0 && (
        <section className="mt-5 space-y-2">
          <h2 className="eyebrow">Past sessions</h2>
          {past.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {s.day_label} — {s.focus}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(s.scheduled_date)}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}
