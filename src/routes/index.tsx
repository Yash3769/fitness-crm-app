import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Plus, Sparkles, ArrowRight, Users, ClipboardCheck, Inbox } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/HealthAlert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/useSession";
import { useClients, usePlans, useRequests, useTrainerProfile } from "@/lib/queries";
import { initials } from "@/lib/domain";
import heroGym from "@/assets/hero-gym.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trainer Dashboard — AI Workout Plan Builder" },
      {
        name: "description",
        content:
          "Track active clients, plans created and drafts awaiting review, then generate AI-assisted workout plans.",
      },
      { property: "og:title", content: "Trainer Dashboard — AI Workout Plan Builder" },
      {
        property: "og:description",
        content: "Personalised, phase-wise workout planning for certified trainers.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({
  icon: Icon,
  value,
  label,
  highlight,
  to,
}: {
  icon: typeof Users;
  value: number | string;
  label: string;
  highlight?: boolean;
  to?: "/admin/requests" | "/clients";
}) {
  const content = (
    <>
      <Icon className={highlight ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
      <p
        className={
          highlight
            ? "display-xl neon mt-3 text-[2rem]"
            : "display-xl mt-3 text-[2rem]"
        }
      >
        {value}
      </p>
      <p className="eyebrow mt-2">{label}</p>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="panel block p-4">
        {content}
      </Link>
    );
  }
  return <div className="panel p-4">{content}</div>;
}


function Dashboard() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useTrainerProfile(user?.id);
  const { data: clients, isLoading } = useClients();
  const { data: plans } = usePlans();
  const { data: pendingRequests } = useRequests("pending");

  useEffect(() => {
    if (user && !profileLoading && (!profile || !profile.onboarded)) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [user, profile, profileLoading, navigate]);

  const awaitingReview = (plans ?? []).filter((p) => p.status === "draft").length;
  const published = (plans ?? []).filter((p) => p.status === "published").length;
  const recent = (clients ?? []).slice(0, 4);

  return (
    <AppShell area="admin"
      title={profile?.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
      subtitle="AI prepares the first draft; you review and approve every plan."
    >
      <div className="relative mb-5 overflow-hidden rounded-3xl border border-border">
        <img
          src={heroGym}
          alt="Trainer coaching a barbell back squat in a dark gym"
          width={1280}
          height={720}
          className="h-44 w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="eyebrow text-primary">Today&apos;s focus</p>
          <p className="display-xl mt-1.5 text-2xl">
            {awaitingReview > 0 ? `${awaitingReview} plans need review` : "All plans reviewed"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} value={clients?.length ?? 0} label="Active clients" />
        <Stat
          icon={Inbox}
          value={pendingRequests?.length ?? 0}
          label="Pending requests"
          highlight={!!pendingRequests?.length}
          to="/admin/requests"
        />
        <Stat icon={ClipboardCheck} value={awaitingReview} label="Awaiting review" to="/clients" />
        <Stat icon={Sparkles} value={published} label="Published plans" />
      </div>

      <div className="mt-6 space-y-3">
        <Button asChild size="lg" className="glow-primary h-13 w-full justify-between text-base font-semibold uppercase tracking-wide">
          <Link to="/clients/new">
            Add New Client
            <Plus className="h-5 w-5" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-13 w-full justify-between text-base font-semibold uppercase tracking-wide">
          <Link to="/generate">
            Generate Workout Plan
            <Sparkles className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow text-foreground">Recently updated</h2>
          <Link to="/clients" className="eyebrow">
            View all
          </Link>
        </div>


        <div className="mt-3 space-y-2.5">
          {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}

          {!isLoading && recent.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
              <p className="text-sm font-semibold">No clients added yet.</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Create your first client profile to generate a personalised workout plan.
              </p>
              <Button asChild className="mt-4">
                <Link to="/clients/new">Add New Client</Link>
              </Button>
            </div>
          )}

          {recent.map((c) => (
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
                <p className="truncate font-semibold">{c.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.fitness_profile?.primary_goal ?? "Goal not set"} ·{" "}
                  {c.fitness_profile?.level ?? "Level not set"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </AppShell>
  );
}
