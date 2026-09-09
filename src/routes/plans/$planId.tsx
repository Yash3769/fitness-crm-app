import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Download,
  History,
  Loader2,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Disclaimer, HealthAlert } from "@/components/HealthAlert";
import { PlanContent } from "@/components/PlanContent";
import { PlanEditor } from "@/components/PlanEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { Field } from "@/components/FormBits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useClient, usePlan, usePlanVersions, useTrainerProfile } from "@/lib/queries";
import { useSession } from "@/hooks/useSession";
import { generatePlan } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { exportPlanPdf } from "@/lib/pdf";
import { buildSessions, todayIso } from "@/lib/scheduling";
import type { WorkoutPlanContent } from "@/lib/plan-types";
import { toast } from "sonner";

type Search = { edit?: boolean | undefined };

export const Route = createFileRoute("/plans/$planId")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    edit: search["edit"] === "1" || search["edit"] === true ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Workout plan — build, review and publish" },
      {
        name: "description",
        content: "Build or review a phase-wise plan, add trainer notes, publish it to your client and export a branded PDF.",
      },
      { property: "og:title", content: "Workout plan — build, review and publish" },
      { property: "og:description", content: "Phase-wise sessions with sets, reps, rest, cues and progressions." },
    ],
  }),
  component: PlanView,
});

function PlanView() {
  const { planId } = Route.useParams();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: plan, isLoading } = usePlan(planId);
  const { data: client } = useClient(plan?.client_id);
  const { data: profile } = useTrainerProfile(user?.id);
  const { data: versions } = usePlanVersions(planId);
  const run = useServerFn(generatePlan);

  const [notes, setNotes] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!!search.edit);
  const [draft, setDraft] = useState<WorkoutPlanContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [startDate, setStartDate] = useState(todayIso());
  const [publishing, setPublishing] = useState(false);
  const [clearanceConfirmed, setClearanceConfirmed] = useState(false);
  const [openVersions, setOpenVersions] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <AppShell area="admin" title="Plan">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }
  if (!plan) {
    return (
      <AppShell area="admin" title="Plan">
        <p className="text-sm text-muted-foreground">This plan no longer exists.</p>
      </AppShell>
    );
  }

  const content = plan.content as WorkoutPlanContent;
  const editContent = draft ?? content;
  const notesValue = notes ?? plan.trainer_notes ?? "";
  const flagged = !!client?.health_flagged;

  function startEditing() {
    setDraft(content);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(null);
    setEditing(false);
  }

  async function saveEdits() {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("workout_plans")
      .update({ content: draft as unknown as never, version: plan!.version + 1 })
      .eq("id", planId);
    setSaving(false);
    if (error) {
      toast.error("Could not save this plan.");
      return;
    }
    setDraft(null);
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["plan", planId] });
    qc.invalidateQueries({ queryKey: ["plan-versions", planId] });
    toast.success("Plan updated.");
  }

  async function saveNotes() {
    const { error } = await supabase
      .from("workout_plans")
      .update({ trainer_notes: notesValue })
      .eq("id", planId);
    if (error) {
      toast.error("Could not save notes.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["plan", planId] });
    toast.success("Notes saved.");
  }

  async function publish() {
    if (!plan || !client) return;
    if (flagged && !clearanceConfirmed) {
      toast.error("Confirm medical clearance before publishing a flagged client's plan.");
      return;
    }
    const start = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Pick a valid start date.");
      return;
    }
    const preferredDays: string[] =
      (client.availability?.preferred_days as string[] | undefined) ??
      (client.training_setup?.available_days as string[] | undefined) ??
      [];
    const { rows, endDate } = buildSessions(planId, plan.client_id, content, start, preferredDays);
    if (!rows.length) {
      toast.error("Add at least one training day before publishing.");
      return;
    }
    setPublishing(true);
    try {
      const { error: sessErr } = await supabase.from("workout_sessions").insert(rows);
      if (sessErr) throw sessErr;
      const { error: planErr } = await supabase
        .from("workout_plans")
        .update({
          status: "published",
          approved: true,
          published_at: new Date().toISOString(),
          start_date: startDate,
          end_date: endDate,
          trainer_notes: notesValue,
        })
        .eq("id", planId);
      if (planErr) throw planErr;
      qc.invalidateQueries({ queryKey: ["plan", planId] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Plan published. Sessions scheduled for your client.");
    } catch {
      toast.error("Could not publish this plan. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function setStatus(next: "published" | "paused" | "archived", extra: Record<string, unknown> = {}) {
    setStatusBusy(true);
    const { error } = await supabase
      .from("workout_plans")
      .update({ status: next, ...extra })
      .eq("id", planId);
    setStatusBusy(false);
    if (error) {
      toast.error("Could not update this plan.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["plan", planId] });
    qc.invalidateQueries({ queryKey: ["plans"] });
    toast.success(
      next === "paused" ? "Plan paused." : next === "archived" ? "Plan archived." : "Plan resumed.",
    );
  }

  async function regenerate() {
    if (!instruction.trim()) {
      toast.error("Describe what should change.");
      return;
    }
    setBusy(true);
    try {
      const result = await run({
        data: { clientId: plan!.client_id, instruction: instruction.trim(), previous: content },
      });
      const revised = JSON.parse(result.planJson) as WorkoutPlanContent;
      const { error } = await supabase
        .from("workout_plans")
        .update({
          content: revised as unknown as never,
          version: plan!.version + 1,
          approved: false,
          status: "draft",
        })
        .eq("id", planId);
      if (error) throw new Error("save failed");
      setInstruction("");
      qc.invalidateQueries({ queryKey: ["plan", planId] });
      qc.invalidateQueries({ queryKey: ["plan-versions", planId] });
      toast.success("Plan revised. Review the new draft.");
    } catch {
      toast.error("Revision failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    exportPlanPdf(content, {
      trainerName: profile?.full_name ?? null,
      businessName: profile?.business_name ?? null,
      certification: profile?.certification_name ?? null,
      clientName: client?.full_name ?? content.summary?.client_name ?? "Client",
      version: plan!.version,
      approved: plan!.approved,
      trainerNotes: notesValue,
    });
  }

  function toggleVersion(id: string) {
    setOpenVersions((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppShell
      area="admin"
      title={content.title || plan.title}
      subtitle={`${client?.full_name ?? "Client"} · Version ${plan.version}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={plan.status} />
        {content.summary?.plan_duration && <Badge variant="secondary">{content.summary.plan_duration}</Badge>}
        {content.summary?.days_per_week && (
          <Badge variant="secondary">{content.summary.days_per_week} days/week</Badge>
        )}
      </div>

      {client && (
        <div className="mt-4">
          <HealthAlert flagged={client.health_flagged} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Plan content</h2>
        {editing ? (
          <Button variant="ghost" size="sm" onClick={cancelEditing}>
            <X className="mr-1.5 h-4 w-4" /> Cancel
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil className="mr-1.5 h-4 w-4" /> Edit plan
          </Button>
        )}
      </div>

      <div className="mt-3">
        {editing ? (
          <div className="space-y-4">
            <PlanEditor content={editContent} onChange={setDraft} />
            <Button className="w-full" onClick={saveEdits} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        ) : (
          <PlanContent content={content} />
        )}
      </div>

      {content.missing_information?.length ? (
        <section className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm shadow-card">
          <h2 className="text-sm font-semibold">Information to confirm</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
            {content.missing_information.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold">Trainer notes</h2>
        <Textarea
          rows={4}
          maxLength={1000}
          value={notesValue}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adjustments, coaching reminders, client-specific context."
        />
        <Button variant="outline" className="w-full" onClick={saveNotes}>
          Save notes
        </Button>
      </section>

      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold">Request an AI revision</h2>
        <Textarea
          rows={3}
          maxLength={600}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Swap barbell squats for goblet squats and reduce sessions to 45 minutes."
        />
        <Button variant="outline" className="w-full" onClick={regenerate} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate plan
        </Button>
      </section>

      {!!versions?.length && (
        <section className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <History className="h-4 w-4" /> Version history
          </h2>
          <div className="divide-y divide-border">
            {versions.map((v) => (
              <Collapsible key={v.id} open={openVersions.has(v.id)} onOpenChange={() => toggleVersion(v.id)}>
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 py-2.5 text-left">
                  <span className="text-sm">
                    v{v.version} · <span className="text-muted-foreground">{v.status}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString()}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3">
                  <PlanContent content={v.content as WorkoutPlanContent} showSummary={false} />
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </section>
      )}

      <div className="mt-5 space-y-3">
        {plan.status === "draft" && (
          <section className="space-y-3 rounded-2xl border border-primary/30 bg-surface p-4 shadow-card">
            <h2 className="text-sm font-semibold">Approve &amp; publish</h2>
            <p className="text-xs text-muted-foreground">
              Publishing schedules dated sessions on your client's preferred training days, starting from the date
              below.
            </p>
            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            {flagged && (
              <label className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
                <Checkbox checked={clearanceConfirmed} onCheckedChange={(v) => setClearanceConfirmed(v === true)} className="mt-0.5" />
                <span>I confirm appropriate medical clearance has been reviewed for this client.</span>
              </label>
            )}
            <Button
              size="lg"
              className="h-13 w-full text-base"
              onClick={publish}
              disabled={publishing || (flagged && !clearanceConfirmed)}
            >
              {publishing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              Approve &amp; publish
            </Button>
          </section>
        )}

        {plan.status === "published" && (
          <Button
            size="lg"
            variant="secondary"
            className="h-13 w-full text-base"
            onClick={() => setStatus("paused")}
            disabled={statusBusy}
          >
            <Pause className="mr-2 h-5 w-5" /> Pause plan
          </Button>
        )}

        {plan.status === "paused" && (
          <Button
            size="lg"
            className="h-13 w-full text-base"
            onClick={() => setStatus("published")}
            disabled={statusBusy}
          >
            <Play className="mr-2 h-5 w-5" /> Resume plan
          </Button>
        )}

        {plan.status !== "archived" && (
          <Button
            size="lg"
            variant="ghost"
            className="h-13 w-full text-base text-muted-foreground"
            onClick={() => setStatus("archived", { archived: true })}
            disabled={statusBusy}
          >
            <Archive className="mr-2 h-5 w-5" /> Archive plan
          </Button>
        )}

        <Button size="lg" variant="secondary" className="h-13 w-full text-base" onClick={download}>
          <Download className="mr-2 h-5 w-5" />
          Export PDF
        </Button>
      </div>

      {client && (
        <div className="mt-4">
          <Link to="/clients/$clientId" params={{ clientId: client.id }} className="text-xs font-semibold text-primary">
            Back to {client.full_name}'s profile
          </Link>
        </div>
      )}

      <div className="mt-6">
        <Disclaimer />
      </div>
    </AppShell>
  );
}
