export type PlanExercise = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  intensity: string;
  tempo?: string;
  duration?: string;
  cue?: string;
  instructions?: string;
  regression?: string;
  progression?: string;
  safety_note?: string;
  /** Demonstration media: a GIF/MP4/image URL. Optional — UI falls back to an illustration. */
  demo_url?: string;
  demo_type?: "gif" | "video" | "image";
};

export type PlanDay = {
  day: string;
  focus: string;
  duration: string;
  warm_up: string[];
  main: PlanExercise[];
  accessory: PlanExercise[];
  conditioning?: string[];
  cool_down: string[];
  trainer_notes?: string;
};

export type PlanPhase = {
  name: string;
  duration: string;
  objective: string;
  progression: string;
  recovery: string;
  advance_criteria: string;
  days: PlanDay[];
};

export type PlanSummary = {
  client_name: string;
  primary_goal: string;
  experience_level: string;
  plan_duration: string;
  days_per_week: string;
  session_duration: string;
  split: string;
  equipment: string;
  key_limitations: string;
};

export type WorkoutPlanContent = {
  title: string;
  summary: PlanSummary;
  phases: PlanPhase[];
  monitoring: {
    weekly_progression: string;
    load_increase_guidance: string;
    deload_guidance: string;
    adjust_signals: string;
    reassessment_date: string;
  };
  programming_notes: string[];
  missing_information: string[];
  review_status: string;
  refused?: boolean;
  refusal_message?: string;
};

export function emptyExercise(): PlanExercise {
  return { name: "", sets: "3", reps: "10", rest: "60s", intensity: "RPE 7" };
}

export function emptyDay(label: string): PlanDay {
  return {
    day: label,
    focus: "",
    duration: "45 min",
    warm_up: [],
    main: [],
    accessory: [],
    conditioning: [],
    cool_down: [],
  };
}

export function emptyPlan(clientName: string): WorkoutPlanContent {
  return {
    title: `${clientName} training plan`,
    summary: {
      client_name: clientName,
      primary_goal: "",
      experience_level: "",
      plan_duration: "4 weeks",
      days_per_week: "3",
      session_duration: "45 min",
      split: "",
      equipment: "",
      key_limitations: "",
    },
    phases: [
      {
        name: "Phase 1",
        duration: "4 weeks",
        objective: "",
        progression: "",
        recovery: "",
        advance_criteria: "",
        days: [],
      },
    ],
    monitoring: {
      weekly_progression: "",
      load_increase_guidance: "",
      deload_guidance: "",
      adjust_signals: "",
      reassessment_date: "",
    },
    programming_notes: [],
    missing_information: [],
    review_status: "Trainer review required",
  };
}

export function dayExercises(day: PlanDay): { key: string; ex: PlanExercise; group: "main" | "accessory" }[] {
  return [
    ...(day.main ?? []).map((ex, i) => ({ key: `m${i}`, ex, group: "main" as const })),
    ...(day.accessory ?? []).map((ex, i) => ({ key: `a${i}`, ex, group: "accessory" as const })),
  ];
}
