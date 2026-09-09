import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/FormBits";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { emptyDay, emptyExercise, type PlanDay, type PlanExercise, type WorkoutPlanContent } from "@/lib/plan-types";

const lines = (arr?: string[]) => (arr ?? []).join("\n");
const split = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

function ExerciseFields({ ex, onChange, onRemove }: { ex: PlanExercise; onChange: (e: PlanExercise) => void; onRemove: () => void }) {
  const set = (p: Partial<PlanExercise>) => onChange({ ...ex, ...p });
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Exercise name" value={ex.name} onChange={(e) => set({ name: e.target.value })} className="flex-1" />
        <Button type="button" size="icon" variant="ghost" aria-label="Remove exercise" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Input placeholder="Sets" value={ex.sets} onChange={(e) => set({ sets: e.target.value })} />
        <Input placeholder="Reps" value={ex.reps} onChange={(e) => set({ reps: e.target.value })} />
        <Input placeholder="Rest" value={ex.rest} onChange={(e) => set({ rest: e.target.value })} />
        <Input placeholder="RPE / %" value={ex.intensity} onChange={(e) => set({ intensity: e.target.value })} />
      </div>
      <Textarea rows={2} placeholder="Step-by-step instructions for the client" value={ex.instructions ?? ""} onChange={(e) => set({ instructions: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Coaching cue" value={ex.cue ?? ""} onChange={(e) => set({ cue: e.target.value })} />
        <Input placeholder="Safety note" value={ex.safety_note ?? ""} onChange={(e) => set({ safety_note: e.target.value })} />
      </div>
      <Input placeholder="Demo URL (GIF, image or MP4) — optional" value={ex.demo_url ?? ""} onChange={(e) => set({ demo_url: e.target.value })} />
    </div>
  );
}

function DayFields({ day, onChange, onRemove }: { day: PlanDay; onChange: (d: PlanDay) => void; onRemove: () => void }) {
  const set = (p: Partial<PlanDay>) => onChange({ ...day, ...p });
  const updateEx = (group: "main" | "accessory", i: number, ex: PlanExercise) => {
    const list = [...(day[group] ?? [])];
    list[i] = ex;
    set({ [group]: list } as Partial<PlanDay>);
  };
  const removeEx = (group: "main" | "accessory", i: number) => set({ [group]: (day[group] ?? []).filter((_, k) => k !== i) } as Partial<PlanDay>);

  return (
    <Collapsible defaultOpen>
      <div className="rounded-2xl border border-border bg-surface">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-left">
          <p className="text-sm font-semibold">{day.day || "Day"}{day.focus ? ` — ${day.focus}` : ""}</p>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 px-3 pb-3">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Day label" value={day.day} onChange={(e) => set({ day: e.target.value })} />
            <Input placeholder="Focus" value={day.focus} onChange={(e) => set({ focus: e.target.value })} />
            <Input placeholder="Duration" value={day.duration} onChange={(e) => set({ duration: e.target.value })} />
          </div>
          <Field label="Warm-up" hint="one per line">
            <Textarea rows={2} value={lines(day.warm_up)} onChange={(e) => set({ warm_up: split(e.target.value) })} />
          </Field>
          <p className="eyebrow">Main exercises</p>
          {(day.main ?? []).map((ex, i) => (
            <ExerciseFields key={i} ex={ex} onChange={(x) => updateEx("main", i, x)} onRemove={() => removeEx("main", i)} />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set({ main: [...(day.main ?? []), emptyExercise()] })}>
            <Plus className="mr-1 h-4 w-4" /> Add main exercise
          </Button>
          <p className="eyebrow">Accessory</p>
          {(day.accessory ?? []).map((ex, i) => (
            <ExerciseFields key={i} ex={ex} onChange={(x) => updateEx("accessory", i, x)} onRemove={() => removeEx("accessory", i)} />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set({ accessory: [...(day.accessory ?? []), emptyExercise()] })}>
            <Plus className="mr-1 h-4 w-4" /> Add accessory
          </Button>
          <Field label="Cool-down" hint="one per line">
            <Textarea rows={2} value={lines(day.cool_down)} onChange={(e) => set({ cool_down: split(e.target.value) })} />
          </Field>
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onRemove}>
            <Trash2 className="mr-1 h-4 w-4" /> Remove day
          </Button>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function PlanEditor({ content, onChange }: { content: WorkoutPlanContent; onChange: (c: WorkoutPlanContent) => void }) {
  const set = (p: Partial<WorkoutPlanContent>) => onChange({ ...content, ...p });
  const phases = content.phases ?? [];
  const setPhase = (i: number, p: Partial<WorkoutPlanContent["phases"][number]>) => {
    const next = [...phases];
    next[i] = { ...next[i]!, ...p };
    set({ phases: next });
  };

  return (
    <div className="space-y-5">
      <Field label="Plan title" required>
        <Input value={content.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary goal">
          <Input value={content.summary?.primary_goal ?? ""} onChange={(e) => set({ summary: { ...content.summary, primary_goal: e.target.value } })} />
        </Field>
        <Field label="Days per week">
          <Input value={content.summary?.days_per_week ?? ""} onChange={(e) => set({ summary: { ...content.summary, days_per_week: e.target.value } })} />
        </Field>
      </div>

      {phases.map((phase, pi) => (
        <section key={pi} className="space-y-3 rounded-2xl border border-primary/30 bg-surface p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Phase name" value={phase.name} onChange={(e) => setPhase(pi, { name: e.target.value })} />
            <Input placeholder="Duration, e.g. 4 weeks" value={phase.duration} onChange={(e) => setPhase(pi, { duration: e.target.value })} />
          </div>
          <Input placeholder="Objective" value={phase.objective} onChange={(e) => setPhase(pi, { objective: e.target.value })} />
          <Input placeholder="Progression rule" value={phase.progression} onChange={(e) => setPhase(pi, { progression: e.target.value })} />
          {(phase.days ?? []).map((day, di) => (
            <DayFields
              key={di}
              day={day}
              onChange={(d) => {
                const days = [...phase.days];
                days[di] = d;
                setPhase(pi, { days });
              }}
              onRemove={() => setPhase(pi, { days: phase.days.filter((_, k) => k !== di) })}
            />
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPhase(pi, { days: [...(phase.days ?? []), emptyDay(`Day ${(phase.days?.length ?? 0) + 1}`)] })}>
              <Plus className="mr-1 h-4 w-4" /> Add training day
            </Button>
            {phases.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => set({ phases: phases.filter((_, k) => k !== pi) })}>
                <Trash2 className="mr-1 h-4 w-4" /> Remove phase
              </Button>
            )}
          </div>
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          set({ phases: [...phases, { name: `Phase ${phases.length + 1}`, duration: "4 weeks", objective: "", progression: "", recovery: "", advance_criteria: "", days: [] }] })
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Add phase
      </Button>
    </div>
  );
}
