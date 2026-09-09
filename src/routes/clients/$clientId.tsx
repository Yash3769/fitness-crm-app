import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Dumbbell,
  FileText,
  HeartPulse,
  History,
  PauseCircle,
  PlayCircle,
  Ruler,
  Sparkles,
  Target,
  Archive,
  Activity as ActivityIcon,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HealthAlert } from "@/components/HealthAlert";
import { StatusBadge } from "@/components/StatusBadge";
import { WeightChart } from "@/components/WeightChart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useActivity, useClient, usePlans, useProgressEntries, useSessions } from "@/lib/queries";
import { calcBmi, bmiBand, initials, READINESS_QUESTIONS } from "@/lib/domain";
import { formatDate } from "@/lib/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client profile — Fitness CRM" },
      {
        name: "description",
        content: "Review a client's goals, measurements, readiness flags, plans, sessions and progress.",
      },
      { property: "og:title", content: "Client profile — Fitness CRM" },
      { property: "og:description", content: "Full client assessment, plan and training history." },
    ],
  }),
  component: ClientDetail,
});

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="mt-1 divide-y divide-border">{children}</div>
    </section>
  );
}

const TABS = ["Profile", "Plans", "Sessions", "Progress", "Activity"] as const;
type Tab = (typeof TABS)[number];

function ClientDetail() {
  const { clientId } = Route.useParams();
  const qc = useQueryClient();
  const { data: client, isLoading } = useClient(clientId);
  const { data: plans } = usePlans(clientId);
  const { data: sessions } = useSessions(clientId);
  const { data: progress } = useProgressEntries(clientId);
  const { data: activity } = useActivity(clientId);

  const [tab, setTab] = useState<Tab>("Profile");
  const [holding, setHolding] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <AppShell area="admin" title="Client">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell area="admin" title="Client">
        <p className="text-sm text-muted-foreground">This client no longer exists.</p>
      </AppShell>
    );
  }

  const fp = client.fitness_profile ?? {};
  const ba = client.body_assessment ?? {};
  const h = client.health ?? {};
  const ts = client.training_setup ?? {};
  const bmi = ba.bmi ?? calcBmi(client.height_cm, client.weight_kg);
  const yesFlags = READINESS_QUESTIONS.filter((q) => h.readiness?.[q.key]).map((q) => q.label);

  async function updateStatus(patch: Record<string, unknown>, message: string) {
    setBusy(true);
    const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
    setBusy(false);
    if (error) {
      toast.error("Could not update this client.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client", clientId] });
    toast.success(message);
  }

  async function putOnHold() {
    await updateStatus({ status: "on_hold", hold_reason: holdReason.trim() || null }, "Client placed on hold.");
    setHolding(false);
    setHoldReason("");
  }

  async function reactivate() {
    await updateStatus({ status: "active", hold_reason: null }, "Client reactivated.");
  }

  async function archive() {
    await updateStatus({ status: "archived", archived: true }, "Client archived.");
  }

  const weightPoints = (progress ?? [])
    .filter((p) => p.weight_kg !== null)
    .map((p) => ({ date: p.recorded_at, value: Number(p.weight_kg) }));

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = (sessions ?? []).filter((s) => s.scheduled_date >= now);
  const past = (sessions ?? []).filter((s) => s.scheduled_date < now);

  return (
    <AppShell
      area="admin"
      title={client.full_name}
      subtitle={`${fp.primary_goal ?? "Goal not set"} · ${fp.level ?? "Level not set"}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
          {initials(client.full_name)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={client.status} />
          {client.age && <Badge variant="secondary">{client.age} yrs</Badge>}
          {client.gender && <Badge variant="secondary">{client.gender}</Badge>}
          {bmi && <Badge variant="secondary">BMI {bmi}</Badge>}
        </div>
      </div>

      {client.hold_reason && client.status === "on_hold" && (
        <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Hold reason: {client.hold_reason}
        </p>
      )}

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Profile" && (
        <div className="mt-4 space-y-4">
          <HealthAlert flagged={client.health_flagged} />

          <div className="space-y-3">
            <Section icon={Target} title="Fitness profile">
              <Row label="Primary goal" value={fp.primary_goal} />
              <Row label="Secondary goals" value={(fp.secondary_goals ?? []).join(", ")} />
              <Row label="Level" value={fp.level} />
              <Row label="Preferred types" value={(fp.preferred_types ?? []).join(", ")} />
              <Row label="Timeline" value={fp.target_timeline_weeks ? `${fp.target_timeline_weeks} weeks` : null} />
              <Row label="History" value={fp.training_history} />
            </Section>

            <Section icon={Ruler} title="Body assessment">
              <Row label="Height" value={client.height_cm ? `${client.height_cm} cm` : null} />
              <Row label="Weight" value={client.weight_kg ? `${client.weight_kg} kg` : null} />
              <Row label="BMI" value={bmi ? `${bmi} — ${bmiBand(Number(bmi))}` : null} />
              <Row label="Waist" value={ba.waist_cm} />
              <Row label="Hip" value={ba.hip_cm} />
              <Row label="Chest" value={ba.chest_cm} />
              <Row label="Body fat" value={ba.body_fat_pct ? `${ba.body_fat_pct}%` : null} />
              <Row label="Posture" value={ba.posture_notes} />
              <Row label="Mobility" value={ba.mobility_notes} />
            </Section>

            <Section icon={HeartPulse} title="Health & readiness">
              <Row label="Flags" value={yesFlags.length ? yesFlags.join(", ") : "None reported"} />
              <Row label="Injuries" value={h.injuries} />
              <Row label="Conditions" value={h.medical_conditions} />
              <Row label="Medications" value={h.medications} />
              <Row label="Restrictions" value={h.doctor_restrictions} />
              <Row label="Pregnancy / postpartum" value={h.pregnancy_postpartum} />
              <Row label="Sleep & stress" value={h.sleep_stress} />
            </Section>

            <Section icon={Dumbbell} title="Training setup">
              <Row label="Days per week" value={ts.days_per_week} />
              <Row label="Session length" value={ts.session_length_min ? `${ts.session_length_min} min` : null} />
              <Row label="Location" value={ts.location} />
              <Row label="Equipment" value={(ts.equipment ?? []).join(", ")} />
              <Row label="Split" value={ts.split_preference} />
              <Row label="Cardio" value={ts.cardio_preference} />
              <Row label="Constraints" value={ts.constraints} />
              <Row label="Preferred days" value={(client.availability?.preferred_days ?? []).join(", ")} />
              <Row label="Preferred time" value={client.availability?.preferred_time} />
            </Section>
          </div>

          <div className="space-y-2">
            {client.status === "active" && !holding && (
              <Button variant="outline" className="w-full" onClick={() => setHolding(true)}>
                <PauseCircle className="mr-2 h-4 w-4" /> Put on hold
              </Button>
            )}
            {holding && (
              <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
                <Textarea
                  rows={2}
                  maxLength={400}
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Optional: reason the client will see."
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setHolding(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button onClick={putOnHold} disabled={busy}>
                    Confirm hold
                  </Button>
                </div>
              </div>
            )}
            {(client.status === "on_hold" || client.status === "archived") && (
              <Button className="w-full" onClick={reactivate} disabled={busy}>
                <PlayCircle className="mr-2 h-4 w-4" /> Reactivate
              </Button>
            )}
            {client.status !== "archived" && (
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={archive} disabled={busy}>
                <Archive className="mr-2 h-4 w-4" /> Archive client
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === "Plans" && (
        <div className="mt-4 space-y-3">
          <Button asChild size="lg" className="h-13 w-full justify-between text-base">
            <Link to="/generate" search={{ clientId }}>
              Generate or build a plan
              <Sparkles className="h-5 w-5" />
            </Link>
          </Button>
          <Section icon={FileText} title="Plans">
            {(plans ?? []).length === 0 && <p className="py-2.5 text-sm text-muted-foreground">No plans yet.</p>}
            {(plans ?? []).map((p) => (
              <Link key={p.id} to="/plans/$planId" params={{ planId: p.id }} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">v{p.version}</p>
                </div>
                <StatusBadge status={p.status} />
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </Section>
        </div>
      )}

      {tab === "Sessions" && (
        <div className="mt-4 space-y-3">
          <Section icon={CalendarDays} title="Upcoming">
            {upcoming.length === 0 && <p className="py-2.5 text-sm text-muted-foreground">No upcoming sessions.</p>}
            {upcoming.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {formatDate(s.scheduled_date)} · {s.day_label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.focus}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </Section>
          <Section icon={History} title="Past">
            {past.length === 0 && <p className="py-2.5 text-sm text-muted-foreground">No past sessions.</p>}
            {past.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {formatDate(s.scheduled_date)} · {s.day_label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.focus}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </Section>
        </div>
      )}

      {tab === "Progress" && (
        <div className="mt-4 space-y-3">
          <section className="panel p-4">
            <h2 className="eyebrow mb-3">Weight trend</h2>
            <WeightChart points={weightPoints} />
          </section>
          <Section icon={TrendingUp} title="Entries">
            {(progress ?? []).length === 0 && <p className="py-2.5 text-sm text-muted-foreground">No progress logged yet.</p>}
            {[...(progress ?? [])].reverse().map((p) => (
              <Row
                key={p.id}
                label={formatDate(p.recorded_at)}
                value={p.weight_kg ? `${p.weight_kg} kg${p.body_fat_pct ? ` · ${p.body_fat_pct}%` : ""}` : p.note}
              />
            ))}
          </Section>
        </div>
      )}

      {tab === "Activity" && (
        <div className="mt-4">
          <Section icon={ActivityIcon} title="Activity">
            {(activity ?? []).length === 0 && <p className="py-2.5 text-sm text-muted-foreground">No activity yet.</p>}
            {(activity ?? []).map((a) => (
              <Row key={a.id} label={new Date(a.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} value={a.message} />
            ))}
          </Section>
        </div>
      )}
    </AppShell>
  );
}
