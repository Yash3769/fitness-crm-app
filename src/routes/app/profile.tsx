import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/HealthAlert";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession, clearPreviewRole } from "@/hooks/useSession";
import { MOCK_ONLY } from "@/lib/preview-mode";
import { useMyClient } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/domain";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Fitness CRM" },
      { name: "description", content: "Your training profile, goals and account settings." },
      { property: "og:title", content: "My profile — Fitness CRM" },
      { property: "og:description", content: "Manage your client account and preferences." },
    ],
  }),
  component: ClientProfilePage,
});

function ClientProfilePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: client, isLoading } = useMyClient(user?.id);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    clearPreviewRole();
    if (!MOCK_ONLY) await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined, role: undefined }, replace: true });
  }

  if (isLoading) {
    return (
      <AppShell area="client" title="Profile">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </AppShell>
    );
  }

  const fp = client?.fitness_profile ?? {};
  const rows: [string, string | null | undefined][] = [
    ["Primary goal", fp.primary_goal],
    ["Level", fp.level],
    ["Occupation", client?.occupation],
    ["Email", client?.email ?? user?.email],
  ];

  return (
    <AppShell area="client" title="Profile" subtitle="Your details as shared with your coach.">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
          {initials(client?.full_name ?? "Client")}
        </div>
        <div>
          <p className="text-lg font-semibold">{client?.full_name ?? "Client"}</p>
          {client && <StatusBadge status={client.status} />}
        </div>
      </div>

      <section className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface px-4 shadow-card">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-3.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-right text-sm font-medium">{value || "Not set"}</span>
          </div>
        ))}
      </section>

      {client && (
        <Button variant="outline" className="mt-6 h-12 w-full" asChild>
          <Link to="/app/onboarding">Edit profile details</Link>
        </Button>
      )}

      <Button variant="ghost" className="mt-2 h-12 w-full text-destructive" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </AppShell>
  );
}
