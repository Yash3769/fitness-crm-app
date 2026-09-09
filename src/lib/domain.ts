export const GOALS = [
  "Fat loss",
  "Muscle gain",
  "Strength",
  "General fitness",
  "Endurance",
  "Mobility",
  "Sports performance",
  "Body recomposition",
  "Return to training",
  "Other",
] as const;

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export const GENDERS = [
  "Female",
  "Male",
  "Non-binary",
  "Prefer to self-describe",
  "Prefer not to say",
] as const;

export const ACTIVITY_LEVELS = [
  "Sedentary (desk based)",
  "Lightly active",
  "Moderately active",
  "Very active",
  "Physically demanding job",
] as const;

export const TRAINING_TYPES = [
  "Weight training",
  "Bodyweight",
  "Functional",
  "HIIT",
  "Circuits",
  "Yoga / mobility",
  "Pilates",
  "Running / cardio",
  "Sport specific",
] as const;

export const SPLITS = [
  "Full body",
  "Upper / lower",
  "Push, pull and legs",
  "Body-part split",
  "Strength-focused",
  "Circuit training",
  "AI recommended",
] as const;

export const LOCATIONS = ["Gym", "Home", "Outdoor", "Mixed"] as const;

export const EQUIPMENT = [
  "Barbell",
  "Dumbbells",
  "Kettlebells",
  "Resistance bands",
  "Cable machine",
  "Pin-loaded machines",
  "Smith machine",
  "Pull-up bar",
  "Bench",
  "Medicine ball",
  "TRX / suspension",
  "Treadmill",
  "Stationary bike",
  "Rowing machine",
  "Bodyweight only",
] as const;

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const CARDIO_PREFS = [
  "None",
  "Low impact only",
  "Steady state",
  "Intervals",
  "Mixed",
] as const;

export const TRAINING_STYLES = [
  "Strength & conditioning",
  "Hypertrophy / bodybuilding",
  "Functional training",
  "General health & wellness",
  "Sports performance",
  "Rehabilitation-aware training",
] as const;

export const READINESS_QUESTIONS = [
  { key: "chest_pain", label: "Chest pain during physical activity" },
  { key: "dizziness", label: "Dizziness or loss of balance" },
  { key: "heart_condition", label: "Known heart condition" },
  { key: "blood_pressure", label: "Uncontrolled blood pressure" },
  { key: "bone_joint", label: "Serious bone or joint concern" },
  { key: "recent_surgery", label: "Surgery in the last 12 months" },
  { key: "doctor_restriction", label: "A medical reason exercise should be restricted" },
] as const;

export type ReadinessKey = (typeof READINESS_QUESTIONS)[number]["key"];

export function calcBmi(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiBand(bmi: number) {
  if (bmi < 18.5) return "Below typical range";
  if (bmi < 25) return "Typical range";
  if (bmi < 30) return "Above typical range";
  return "Well above typical range";
}

export function isHealthFlagged(health: Record<string, unknown>): boolean {
  const readiness = (health["readiness"] as Record<string, boolean>) ?? {};
  const anyYes = READINESS_QUESTIONS.some((q) => readiness[q.key] === true);
  const restrictions = String(health["doctor_restrictions"] ?? "").trim().length > 0;
  return anyYes || restrictions;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
