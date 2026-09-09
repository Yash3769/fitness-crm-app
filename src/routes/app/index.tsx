import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock, PauseCircle, Sparkles, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/HealthAlert";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/useSession";
import { useMyClient, useMyRequests, usePlans, useSessions } from "@/lib/queries";
import { formatDate } from "@/lib/scheduling";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "My Training — Fitness CRM" },
      { name: "description", content: "Your personalised training plan, workouts and progress in one place." },
      { property: "og:title", content: "My Training — Fitness CRM" },
      { property: "og:description", content: "Follow your coach's plan and track your progress." },
    ],
  }),
  component: ClientHomePage,
});

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">{children}</div>;
}

function ClientHomePage() {
  const { user } = useSession();
  const { data: client, isLoading: clientLoading } = useMyClient(user?.id);
  const { data: requests } = useMyRequests(user?.id);
  const { data: plans } = usePlans(client?.id);
  const { data: sessions } = useSessions(client?.id);

  if (clientLoading) {
    return (
      <AppShell area="client" title="Welcome">
        <Skeleton className="h-28 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell area="client" title="Welcome" subtitle="Let's get you set up with your coach.">
        <Card>
          <p className="text-sm font-semibold">You haven't started yet.</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tell your coach about your goals, health and availability to request training.
          </p>
          <Button asChild className="mt-4">
            <Link to="/app/onboarding">Get started</Link>
          </Button>
        </Card>
        <div className="mt-8">
          <Disclaimer />
        </div>
      </AppShell>
    );
  }

  if (client.status === "pending") {
    return (
      <AppShell area="client" title="Request sent" subtitle="Your coach will review your details shortly.">
        <Card>
          <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Pending review</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You'll be notified as soon as your coach accepts your request.
          </p>
        </Card>
        <div className="mt-8">
          <Disclaimer />
        </div>
      </AppShell>
    );
  }

  if (client.status === "rejected") {
    const latest = (requests ?? [])[0];
    return (
      <AppShell area="client" title="Request not accepted">
        <Card>
          <XCircle className="mx-auto h-6 w-6 text-destructive" />
          <p className="mt-3 text-sm font-semibold">Your coach couldn't accept this request</p>
          {latest?.rejection_reason && (
            <p className="mt-1.5 text-sm text-muted-foreground">{latest.rejection_reason}</p>
          )}
          <Button asChild className="mt-4">
            <Link to="/app/onboarding">Submit a new request</Link>
          </Button>
        </Card>
        <div className="mt-8">
          <Disclaimer />
        </div>
      </AppShell>
    );
  }

  if (client.status === "on_hold") {
    return (
      <AppShell area="client" title="Account on hold">
        <Card>
          <PauseCircle className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Your account is on hold</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {client.hold_reason || "Please contact your coach for more information."}
          </p>
        </Card>
        <div className="mt-8">
          <Disclaimer />
        </div>
      </AppShell>
    );
  }

  if (client.status === "archived") {
    return (
      <AppShell area="client" title="Account inactive">
        <Card>
          <p className="text-sm font-semibold">Your account is no longer active.</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Contact your coach if you think this is a mistake.</p>
        </Card>
        <div className="mt-8">
          <Disclaimer />
        </div>
      </AppShell>
    );
  }

  const plan = (plans ?? []).find((p) => p.status === "published" || p.status === "paused" || p.status === "completed");
  const today = new Date().toISOString().slice(0, 10);
  const next = (sessions ?? []).find((s) => s.status !== "completed" && s.status !== "skipped" && s.scheduled_date >= today);

  return (
    <AppShell area="client" title={`Welcome${client.full_name ? `, ${client.full_name.split(" ")[0]}` : ""}`}>
      {!plan && (
        <Card>
          <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Your coach is preparing your plan</p>
          <p className="mt-1.5 text-sm text-muted-foreground">You'll be notified the moment it's published.</p>
        </Card>
      )}

      {plan && (
        <div className="space-y-3">
          <Link to="/app/plan" className="block rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{plan.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.content?.summary?.plan_duration ?? ""} · {plan.content?.summary?.days_per_week ?? "?"} days/week
                </p>
              </div>
              <StatusBadge status={plan.status} />
            </div>
            <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
              View plan <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          {next && (
            <Link
              to="/app/workout/$sessionId"
              params={{ sessionId: next.id }}
              className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  Next: {next.day_label} — {next.focus}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(next.scheduled_date)}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            </Link>
          )}
        </div>
      )}

      <div className="mt-8">
        <Disclaimer />
      </div>
    </AppShell>
  );
}
