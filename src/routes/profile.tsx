import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/HealthAlert";
import { Button } from "@/components/ui/button";
import { useSession, clearPreviewRole } from "@/hooks/useSession";
import { MOCK_ONLY } from "@/lib/preview-mode";
import { useTrainerProfile } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/domain";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Trainer profile — AI Workout Plan Builder" },
      {
        name: "description",
        content: "Your certification details, training style and account settings.",
      },
      { property: "og:title", content: "Trainer profile — AI Workout Plan Builder" },
      { property: "og:description", content: "Manage your trainer account and preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useTrainerProfile(user?.id);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    clearPreviewRole();
    if (!MOCK_ONLY) await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined, role: undefined }, replace: true });
  }

  const rows: [string, string | null | undefined][] = [
    ["Gym / business", profile?.business_name],
    ["Certification", profile?.certification_name],
    ["Certification number", profile?.certification_number],
    ["Experience", profile?.years_experience ? `${profile.years_experience} years` : null],
    ["Training style", profile?.training_style],
    ["Measurements", profile?.measurement_system === "imperial" ? "Imperial" : "Metric"],
    ["Email", user?.email ?? null],
  ];

  return (
    <AppShell area="admin" title="Profile" subtitle="Your trainer details appear on exported plans.">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
          {initials(profile?.full_name ?? "Trainer")}
        </div>
        <div>
          <p className="text-lg font-semibold">{profile?.full_name ?? "Trainer"}</p>
          <p className="text-sm text-muted-foreground">{profile?.business_name ?? "Independent"}</p>
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

      <Button
        variant="outline"
        className="mt-6 h-12 w-full"
        onClick={() => navigate({ to: "/onboarding" })}
      >
        Edit profile details
      </Button>

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
