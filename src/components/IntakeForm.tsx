import { useState, type ReactNode } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ChipGroup, Field, StepProgress } from "@/components/FormBits";
import { HealthAlert, Disclaimer } from "@/components/HealthAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ACTIVITY_LEVELS,
  CARDIO_PREFS,
  DAYS,
  EQUIPMENT,
  GENDERS,
  GOALS,
  LEVELS,
  LOCATIONS,
  READINESS_QUESTIONS,
  SPLITS,
  TRAINING_TYPES,
  calcBmi,
  bmiBand,
  isHealthFlagged,
} from "@/lib/domain";
import { toast } from "sonner";

export const TIMES_OF_DAY = ["Early morning", "Morning", "Midday", "Evening", "Late evening", "Flexible"] as const;

export type IntakeValues = {
  basic: {
    full_name: string;
    age: string;
    gender: string;
    height_cm: string;
    weight_kg: string;
    occupation: string;
    activity_level: string;
  };
  fitness: {
    primary_goal: string;
    secondary_goals: string[];
    level: string;
    training_history: string;
    preferred_types: string[];
    target_timeline_weeks: string;
  };
  body: {
    waist_cm: string;
    hip_cm: string;
    chest_cm: string;
    arm_cm: string;
    thigh_cm: string;
    body_fat_pct: string;
    posture_notes: string;
    mobility_notes: string;
  };
  health: {
    readiness: Record<string, boolean>;
    injuries: string;
    medical_conditions: string;
    medications: string;
    doctor_restrictions: string;
    pregnancy_postpartum: string;
    sleep_stress: string;
  };
  setup: {
    days_per_week: string;
    available_days: string[];
    session_length_min: string;
    location: string;
    equipment: string[];
    split_preference: string;
    cardio_preference: string;
    constraints: string;
  };
  availability: {
    preferred_days: string[];
    preferred_time: string;
    notes: string;
  };
  message: string;
};

export function emptyIntake(): IntakeValues {
  return {
    basic: { full_name: "", age: "", gender: "", height_cm: "", weight_kg: "", occupation: "", activity_level: "" },
    fitness: { primary_goal: "", secondary_goals: [], level: "", training_history: "", preferred_types: [], target_timeline_weeks: "12" },
    body: { waist_cm: "", hip_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", body_fat_pct: "", posture_notes: "", mobility_notes: "" },
    health: { readiness: {}, injuries: "", medical_conditions: "", medications: "", doctor_restrictions: "", pregnancy_postpartum: "", sleep_stress: "" },
    setup: { days_per_week: "3", available_days: [], session_length_min: "60", location: "", equipment: [], split_preference: "AI recommended", cardio_preference: "", constraints: "" },
    availability: { preferred_days: [], preferred_time: "", notes: "" },
    message: "",
  };
}

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Rebuilds form values from an existing client row so a client can edit and resubmit. */
export function intakeFromClient(c: any): IntakeValues {
  const e = emptyIntake();
  return {
    basic: {
      full_name: s(c.full_name),
      age: s(c.age),
      gender: s(c.gender),
      height_cm: s(c.height_cm),
      weight_kg: s(c.weight_kg),
      occupation: s(c.occupation),
      activity_level: s(c.activity_level),
    },
    fitness: { ...e.fitness, ...(c.fitness_profile ?? {}) },
    body: { ...e.body, ...(c.body_assessment ?? {}) },
    health: { ...e.health, ...(c.health ?? {}) },
    setup: { ...e.setup, ...(c.training_setup ?? {}) },
    availability: { ...e.availability, ...(c.availability ?? {}) },
    message: "",
  };
}

/** Converts form values to the columns stored on the clients table. */
export function intakeToClientRow(v: IntakeValues) {
  const bmi = calcBmi(Number(v.basic.height_cm) || null, Number(v.basic.weight_kg) || null);
  return {
    full_name: v.basic.full_name.trim().slice(0, 120),
    age: Number(v.basic.age),
    gender: v.basic.gender || null,
    height_cm: v.basic.height_cm ? Number(v.basic.height_cm) : null,
    weight_kg: v.basic.weight_kg ? Number(v.basic.weight_kg) : null,
    occupation: v.basic.occupation.trim() || null,
    activity_level: v.basic.activity_level || null,
    fitness_profile: v.fitness,
    body_assessment: { ...v.body, bmi },
    health: v.health,
    training_setup: v.setup,
    availability: v.availability,
    health_flagged: isHealthFlagged(v.health as unknown as Record<string, unknown>),
  };
}

const LABELS = ["About you", "Goals", "Body assessment", "Health & readiness", "Training setup", "Availability", "Review"];

export function IntakeForm({
  initial,
  submitLabel = "Submit",
  saving,
  onSubmit,
  onCancel,
  showMessage,
}: {
  initial?: IntakeValues | undefined;
  submitLabel?: string;
  saving?: boolean;
  onSubmit: (values: IntakeValues) => void;
  onCancel?: () => void;
  showMessage?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [v, setV] = useState<IntakeValues>(initial ?? emptyIntake());
  const total = LABELS.length;
  const { basic, fitness, body, health, setup, availability } = v;
  const setBasic = (p: Partial<IntakeValues["basic"]>) => setV({ ...v, basic: { ...basic, ...p } });
  const setFitness = (p: Partial<IntakeValues["fitness"]>) => setV({ ...v, fitness: { ...fitness, ...p } });
  const setBody = (p: Partial<IntakeValues["body"]>) => setV({ ...v, body: { ...body, ...p } });
  const setHealth = (p: Partial<IntakeValues["health"]>) => setV({ ...v, health: { ...health, ...p } });
  const setSetup = (p: Partial<IntakeValues["setup"]>) => setV({ ...v, setup: { ...setup, ...p } });
  const setAvail = (p: Partial<IntakeValues["availability"]>) => setV({ ...v, availability: { ...availability, ...p } });

  const bmi = calcBmi(Number(basic.height_cm) || null, Number(basic.weight_kg) || null);
  const flagged = isHealthFlagged(health as unknown as Record<string, unknown>);

  function validateStep(): string | null {
    if (step === 1) {
      if (!basic.full_name.trim()) return "Your name is required.";
      if (!basic.age || Number(basic.age) < 12 || Number(basic.age) > 100) return "Enter an age between 12 and 100.";
    }
    if (step === 2 && !fitness.primary_goal) return "Select a primary goal.";
    if (step === 2 && !fitness.level) return "Select a training level.";
    if (step === 5 && !setup.location) return "Select a training location.";
    if (step === 6 && !availability.preferred_days.length) return "Pick at least one day you can train.";
    return null;
  }

  function next() {
    const problem = validateStep();
    if (problem) {
      toast.error(problem);
      return;
    }
    setStep((x) => Math.min(total, x + 1));
    window.scrollTo({ top: 0 });
  }

  function back() {
    if (step === 1) return onCancel?.();
    setStep((x) => x - 1);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="space-y-6">
      <StepProgress step={step} total={total} labels={LABELS} />

      {step === 1 && (
        <div className="space-y-5">
          <Field label="Full name" required>
            <Input value={basic.full_name} maxLength={120} onChange={(e) => setBasic({ full_name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" required>
              <Input type="number" min={12} max={100} value={basic.age} onChange={(e) => setBasic({ age: e.target.value })} />
            </Field>
            <Field label="Gender">
              <Select value={basic.gender} onValueChange={(x) => setBasic({ gender: x })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Height (cm)">
              <Input type="number" value={basic.height_cm} onChange={(e) => setBasic({ height_cm: e.target.value })} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" value={basic.weight_kg} onChange={(e) => setBasic({ weight_kg: e.target.value })} />
            </Field>
          </div>
          {bmi && (
            <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
              BMI <span className="font-semibold">{bmi}</span> — {bmiBand(bmi)}. A screening reference only, not a diagnosis.
            </p>
          )}
          <Field label="Occupation" hint="Optional">
            <Input value={basic.occupation} maxLength={120} onChange={(e) => setBasic({ occupation: e.target.value })} />
          </Field>
          <Field label="Daily activity level">
            <Select value={basic.activity_level} onValueChange={(x) => setBasic({ activity_level: x })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{ACTIVITY_LEVELS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Field label="Primary goal" required>
            <ChipGroup options={GOALS} multi={false} value={fitness.primary_goal ? [fitness.primary_goal] : []} onChange={(x) => setFitness({ primary_goal: x[0] ?? "" })} />
          </Field>
          <Field label="Secondary goals" hint="Optional">
            <ChipGroup options={GOALS} value={fitness.secondary_goals} onChange={(x) => setFitness({ secondary_goals: x })} />
          </Field>
          <Field label="Training level" required>
            <ChipGroup options={LEVELS} multi={false} value={fitness.level ? [fitness.level] : []} onChange={(x) => setFitness({ level: x[0] ?? "" })} />
          </Field>
          <Field label="Preferred training types">
            <ChipGroup options={TRAINING_TYPES} value={fitness.preferred_types} onChange={(x) => setFitness({ preferred_types: x })} />
          </Field>
          <Field label="Training history" hint="Optional">
            <Textarea rows={3} maxLength={600} value={fitness.training_history} onChange={(e) => setFitness({ training_history: e.target.value })} placeholder="Past programmes, layoffs, sports..." />
          </Field>
          <Field label="Target timeline (weeks)">
            <Input type="number" min={4} max={52} value={fitness.target_timeline_weeks} onChange={(e) => setFitness({ target_timeline_weeks: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">All measurements are optional. Add what you know.</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ["waist_cm", "Waist (cm)"],
              ["hip_cm", "Hip (cm)"],
              ["chest_cm", "Chest (cm)"],
              ["arm_cm", "Arm (cm)"],
              ["thigh_cm", "Thigh (cm)"],
              ["body_fat_pct", "Body fat (%)"],
            ] as const).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input type="number" value={body[key]} onChange={(e) => setBody({ [key]: e.target.value } as any)} />
              </Field>
            ))}
          </div>
          <Field label="Posture observations" hint="Optional">
            <Textarea rows={3} maxLength={600} value={body.posture_notes} onChange={(e) => setBody({ posture_notes: e.target.value })} />
          </Field>
          <Field label="Mobility observations" hint="Optional">
            <Textarea rows={3} maxLength={600} value={body.mobility_notes} onChange={(e) => setBody({ mobility_notes: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Physical-activity readiness screening. Answer honestly — it keeps your plan safe.</p>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {READINESS_QUESTIONS.map((q) => (
              <div key={q.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <Label htmlFor={q.key} className="text-sm font-normal leading-snug">{q.label}</Label>
                <Switch id={q.key} checked={!!health.readiness[q.key]} onCheckedChange={(x) => setHealth({ readiness: { ...health.readiness, [q.key]: x } })} />
              </div>
            ))}
          </div>
          <HealthAlert flagged={flagged} />
          <Field label="Injuries or pain points" hint="Optional">
            <Textarea rows={3} maxLength={600} value={health.injuries} onChange={(e) => setHealth({ injuries: e.target.value })} />
          </Field>
          <Field label="Medical conditions" hint="Optional">
            <Textarea rows={3} maxLength={600} value={health.medical_conditions} onChange={(e) => setHealth({ medical_conditions: e.target.value })} />
          </Field>
          <Field label="Medications affecting training" hint="Optional">
            <Input maxLength={200} value={health.medications} onChange={(e) => setHealth({ medications: e.target.value })} />
          </Field>
          <Field label="Doctor-advised restrictions" hint="Optional">
            <Textarea rows={2} maxLength={400} value={health.doctor_restrictions} onChange={(e) => setHealth({ doctor_restrictions: e.target.value })} />
          </Field>
          <Field label="Pregnancy or postpartum notes" hint="Optional">
            <Input maxLength={200} value={health.pregnancy_postpartum} onChange={(e) => setHealth({ pregnancy_postpartum: e.target.value })} />
          </Field>
          <Field label="Sleep and stress" hint="Optional">
            <Input maxLength={200} value={health.sleep_stress} onChange={(e) => setHealth({ sleep_stress: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Days per week">
              <Input type="number" min={1} max={7} value={setup.days_per_week} onChange={(e) => setSetup({ days_per_week: e.target.value })} />
            </Field>
            <Field label="Session length (min)">
              <Input type="number" min={15} max={150} value={setup.session_length_min} onChange={(e) => setSetup({ session_length_min: e.target.value })} />
            </Field>
          </div>
          <Field label="Training location" required>
            <ChipGroup options={LOCATIONS} multi={false} value={setup.location ? [setup.location] : []} onChange={(x) => setSetup({ location: x[0] ?? "" })} />
          </Field>
          <Field label="Available equipment">
            <ChipGroup options={EQUIPMENT} value={setup.equipment} onChange={(x) => setSetup({ equipment: x })} />
          </Field>
          <Field label="Split preference">
            <ChipGroup options={SPLITS} multi={false} value={setup.split_preference ? [setup.split_preference] : []} onChange={(x) => setSetup({ split_preference: x[0] ?? "" })} />
          </Field>
          <Field label="Cardio preference">
            <ChipGroup options={CARDIO_PREFS} multi={false} value={setup.cardio_preference ? [setup.cardio_preference] : []} onChange={(x) => setSetup({ cardio_preference: x[0] ?? "" })} />
          </Field>
          <Field label="Exercise constraints or dislikes" hint="Optional">
            <Textarea rows={3} maxLength={600} value={setup.constraints} onChange={(e) => setSetup({ constraints: e.target.value })} />
          </Field>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Your coach schedules workouts around the days and times that suit you.</p>
          <Field label="Days you can train" required>
            <ChipGroup options={DAYS} value={availability.preferred_days} onChange={(x) => setAvail({ preferred_days: x, })} />
          </Field>
          <Field label="Preferred time of day">
            <ChipGroup options={TIMES_OF_DAY} multi={false} value={availability.preferred_time ? [availability.preferred_time] : []} onChange={(x) => setAvail({ preferred_time: x[0] ?? "" })} />
          </Field>
          <Field label="Scheduling notes" hint="Optional">
            <Textarea rows={3} maxLength={400} value={availability.notes} onChange={(e) => setAvail({ notes: e.target.value })} placeholder="e.g. Travelling the last week of the month; shorter sessions on Wednesdays." />
          </Field>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4">
          <ReviewBlock title="About you">
            {basic.full_name} · {basic.age} yrs {basic.gender ? `· ${basic.gender}` : ""}{bmi ? ` · BMI ${bmi}` : ""}
          </ReviewBlock>
          <ReviewBlock title="Goals">
            {fitness.primary_goal} · {fitness.level}{fitness.preferred_types.length ? ` · ${fitness.preferred_types.join(", ")}` : ""}
          </ReviewBlock>
          <ReviewBlock title="Training setup">
            {setup.days_per_week} days/week · {setup.session_length_min} min · {setup.location}{setup.equipment.length ? ` · ${setup.equipment.join(", ")}` : ""}
          </ReviewBlock>
          <ReviewBlock title="Availability">
            {availability.preferred_days.join(", ")}{availability.preferred_time ? ` · ${availability.preferred_time}` : ""}
          </ReviewBlock>
          <HealthAlert flagged={flagged} />
          {showMessage && (
            <Field label="Message to your coach" hint="Optional">
              <Textarea rows={3} maxLength={500} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} placeholder="Anything else your coach should know?" />
            </Field>
          )}
          <Disclaimer />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" size="lg" className="h-13 flex-1" onClick={back} type="button">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        {step < total ? (
          <Button size="lg" className="h-13 flex-[2]" onClick={next} type="button">Continue</Button>
        ) : (
          <Button size="lg" className="glow-primary h-13 flex-[2] font-semibold uppercase tracking-wide" onClick={() => onSubmit(v)} disabled={saving} type="button">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="eyebrow">{title}</p>
      <p className="mt-1.5 text-sm">{children}</p>
    </div>
  );
}
