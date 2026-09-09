import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ExerciseDemo } from "@/components/ExerciseDemo";
import { StepProgress } from "@/components/FormBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/useSession";
import { useCompletions, useMyClient, usePlan, useSessionById } from "@/lib/queries";
import { dayExercises, type WorkoutPlanContent } from "@/lib/plan-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/workout/$sessionId")({
  head: () => ({
    meta: [
      { title: "Workout — Fitness CRM" },
      { name: "description", content: "Step-by-step exercise demos, sets and reps for today's workout." },
      { property: "og:title", content: "Workout — Fitness CRM" },
      { property: "og:description", content: "Follow along and track each exercise." },
    ],
  }),
  component: WorkoutPage,
});

function WorkoutPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: client } = useMyClient(user?.id);
  const { data: session, isLoading: sessionLoading } = useSessionById(sessionId);
  const { data: plan, isLoading: planLoading } = usePlan(session?.plan_id);
  const { data: completions } = useCompletions(sessionId);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const active = client?.status === "active";
  const sessionStatus = session?.status;

  useEffect(() => {
    if (!active || sessionStatus !== "scheduled") return;
    supabase
      .from("workout_sessions")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", sessionId)
      .then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ["session", sessionId] });
      });
  }, [active, sessionStatus, sessionId, qc]);

  if (sessionLoading || planLoading) {
    return (
      <AppShell area="client" hideNav>
        <div className="py-10">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!session || !plan) {
    return (
      <AppShell area="client" title="Workout" hideNav>
        <p className="text-sm text-muted-foreground">This workout is no longer available.</p>
      </AppShell>
    );
  }

  const content = plan.content as WorkoutPlanContent;
  const day = content.phases?.[session.phase_index]?.days?.[session.day_index];

  if (!day) {
    return (
      <AppShell area="client" title="Workout" hideNav>
        <p className="text-sm text-muted-foreground">This workout's details couldn't be found.</p>
      </AppShell>
    );
  }

  const exercises = dayExercises(day);
  const total = exercises.length + 2; // warm-up + each exercise + cool-down
  const labels = ["Warm-up", ...exercises.map((e) => e.ex.name || "Exercise"), "Cool-down"];
  const completedKeys = new Set((completions ?? []).map((c) => c.exercise_key));
  const finished = session.status === "completed";

  async function markComplete(key: string, name: string) {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase
      .from("exercise_completions")
      .upsert(
        { session_id: sessionId, client_id: session!.client_id, exercise_key: key, exercise_name: name, completed: true },
        { onConflict: "session_id,exercise_key" },
      );
    setBusy(false);
    if (error) {
      toast.error("Could not save this exercise.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["completions", sessionId] });
  }

  async function finish() {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase
      .from("workout_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    setBusy(false);
    if (error) {
      toast.error("Could not finish this workout.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["session", sessionId] });
    qc.invalidateQueries({ queryKey: ["sessions"] });
    toast.success("Workout complete. Nice work!");
    navigate({ to: "/app/plan" });
  }

  return (
    <AppShell area="client" title={`${session.day_label} — ${session.focus}`} hideNav>
      {!active && (
        <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/15 p-4 text-sm text-warning-foreground">
          Your account is currently on hold, so this workout is read-only.
        </div>
      )}

      <StepProgress step={step + 1} total={total} labels={labels} />

      <div className="mt-5">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Warm-up</h2>
            {day.warm_up?.length ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {day.warm_up.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No warm-up listed — ease into the first exercise.</p>
            )}
          </div>
        )}

        {step > 0 && step <= exercises.length && (
          <div className="space-y-3">
            {(() => {
              const { key, ex } = exercises[step - 1]!;
              const done = completedKeys.has(key);
              return (
                <>
                  <ExerciseDemo ex={ex} />
                  <h2 className="text-lg font-bold">{ex.name}</h2>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{ex.sets} sets</Badge>
                    <Badge variant="secondary">{ex.reps} reps</Badge>
                    <Badge variant="secondary">Rest {ex.rest}</Badge>
                    {ex.intensity && <Badge variant="secondary">{ex.intensity}</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {ex.instructions && <p>{ex.instructions}</p>}
                    {ex.cue && <p>Cue: {ex.cue}</p>}
                    {ex.safety_note && <p className="text-warning-foreground">Safety: {ex.safety_note}</p>}
                  </div>
                  <Button
                    className="w-full"
                    variant={done ? "secondary" : "default"}
                    onClick={() => markComplete(key, ex.name)}
                    disabled={busy || !active}
                  >
                    {done ? <Check className="mr-2 h-4 w-4" /> : null}
                    {done ? "Marked complete" : "Mark complete"}
                  </Button>
                </>
              );
            })()}
          </div>
        )}

        {step === total - 1 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Cool-down</h2>
            {day.cool_down?.length ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {day.cool_down.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No cool-down listed — stretch as needed.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="lg" className="h-13 flex-1" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        {step < total - 1 ? (
          <Button size="lg" className="h-13 flex-[2]" onClick={() => setStep((s) => Math.min(total - 1, s + 1))}>
            Next <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" className="h-13 flex-[2]" onClick={finish} disabled={busy || !active || finished}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {finished ? "Already finished" : "Finish workout"}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
