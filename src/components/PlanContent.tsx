import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PlanExercise, WorkoutPlanContent } from "@/lib/plan-types";

export function ExerciseCard({ ex }: { ex: PlanExercise }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-semibold">{ex.name}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{ex.sets} sets</Badge>
        <Badge variant="secondary">{ex.reps} reps</Badge>
        <Badge variant="secondary">Rest {ex.rest}</Badge>
        {ex.intensity && <Badge variant="secondary">{ex.intensity}</Badge>}
        {ex.tempo && <Badge variant="secondary">Tempo {ex.tempo}</Badge>}
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {ex.instructions && <p>{ex.instructions}</p>}
        {ex.cue && <p>Cue: {ex.cue}</p>}
        {ex.regression && <p>Easier: {ex.regression}</p>}
        {ex.progression && <p>Harder: {ex.progression}</p>}
        {ex.safety_note && <p className="text-warning-foreground">Safety: {ex.safety_note}</p>}
      </div>
    </div>
  );
}

/** Read-only rendering of a plan's phases, days and exercises. Shared by coach and client views. */
export function PlanContent({ content, showSummary = true }: { content: WorkoutPlanContent; showSummary?: boolean }) {
  return (
    <div className="space-y-4">
      {showSummary && content.summary && (
        <section className="panel p-4">
          <h2 className="eyebrow">Plan summary</h2>
          <div className="mt-2 space-y-1.5 text-sm">
            {Object.entries(content.summary).map(([k, v]) =>
              v ? (
                <div key={k} className="flex justify-between gap-4">
                  <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
                  <span className="text-right font-medium">{String(v)}</span>
                </div>
              ) : null,
            )}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {(content.phases ?? []).map((phase, i) => (
          <Collapsible key={i} defaultOpen={i === 0}>
            <div className="panel">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <div>
                  <p className="font-display font-bold uppercase tracking-wide">{phase.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {phase.duration}
                    {phase.objective ? ` · ${phase.objective}` : ""}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 px-4 pb-4">
                {(phase.progression || phase.recovery || phase.advance_criteria) && (
                  <div className="space-y-1 rounded-xl bg-secondary p-3 text-xs">
                    {phase.progression && <p><span className="font-semibold">Progression:</span> {phase.progression}</p>}
                    {phase.recovery && <p><span className="font-semibold">Recovery:</span> {phase.recovery}</p>}
                    {phase.advance_criteria && <p><span className="font-semibold">Advance when:</span> {phase.advance_criteria}</p>}
                  </div>
                )}
                {(phase.days ?? []).map((day, di) => (
                  <div key={di} className="space-y-2.5">
                    <p className="text-sm font-semibold">
                      {day.day} — {day.focus}{" "}
                      <span className="font-normal text-muted-foreground">({day.duration})</span>
                    </p>
                    {day.warm_up?.length > 0 && (
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Warm-up:</span> {day.warm_up.join("; ")}</p>
                    )}
                    {(day.main ?? []).map((ex, xi) => <ExerciseCard key={`m${xi}`} ex={ex} />)}
                    {(day.accessory ?? []).map((ex, xi) => <ExerciseCard key={`a${xi}`} ex={ex} />)}
                    {day.conditioning?.length ? (
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Conditioning:</span> {day.conditioning.join("; ")}</p>
                    ) : null}
                    {day.cool_down?.length > 0 && (
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Cool-down:</span> {day.cool_down.join("; ")}</p>
                    )}
                    {day.trainer_notes && <p className="text-xs text-muted-foreground">{day.trainer_notes}</p>}
                  </div>
                ))}
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {content.monitoring && Object.values(content.monitoring).some(Boolean) && (
        <section className="panel p-4 text-sm">
          <h2 className="eyebrow">Progress monitoring</h2>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            {content.monitoring.weekly_progression && <li>{content.monitoring.weekly_progression}</li>}
            {content.monitoring.load_increase_guidance && <li>{content.monitoring.load_increase_guidance}</li>}
            {content.monitoring.deload_guidance && <li>{content.monitoring.deload_guidance}</li>}
            {content.monitoring.adjust_signals && <li>{content.monitoring.adjust_signals}</li>}
            {content.monitoring.reassessment_date && <li>Reassessment: {content.monitoring.reassessment_date}</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
