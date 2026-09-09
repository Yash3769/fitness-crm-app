import { PREVIEW_USER_ID } from "./preview-mode";

/**
 * A tiny localStorage-backed stand-in for Supabase, used only in dev "Preview mode" (see
 * preview-mode.ts). It's swapped in for the real `supabase.from(...)` calls so that every screen
 * — coach and client — can actually save data while browsing, without needing a real account or
 * network access. It mirrors just the query-builder surface this app actually uses (select,
 * insert, update, upsert, delete, eq, in, order, limit, maybeSingle) and re-implements the handful
 * of DB triggers (notifications, activity log, plan version snapshots) that the real schema does
 * automatically, so the UI behaves the same way it would against the real backend.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
type Db = Record<string, Row[]>;

const DB_KEY = "fitness_crm_preview_data";

let cache: Db | null = null;

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function offsetIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function offsetDate(days: number): string {
  return offsetIso(days).slice(0, 10);
}

function buildSeed(): Db {
  const now = nowIso();
  const adminId = PREVIEW_USER_ID.admin;
  const clientId = PREVIEW_USER_ID.client;
  const sarahId = uuid();
  const johnId = uuid();
  const marcusId = uuid();
  const planId = uuid();

  const planContent = {
    title: "Sarah Chen training plan",
    summary: {
      client_name: "Sarah Chen",
      primary_goal: "Fat loss",
      experience_level: "Beginner",
      plan_duration: "4 weeks",
      days_per_week: "3",
      session_duration: "45 min",
      split: "Full body",
      equipment: "Dumbbells, bench",
      key_limitations: "None reported",
    },
    phases: [
      {
        name: "Phase 1 — Foundation",
        duration: "4 weeks",
        objective: "Build consistency and technique.",
        progression: "Add 2.5kg once all sets hit the top of the rep range with good form.",
        recovery: "One full rest day between sessions.",
        advance_criteria: "3 consecutive sessions completed at RPE 8 or below.",
        days: [
          {
            day: "Day 1",
            focus: "Full body — Strength",
            duration: "45 min",
            warm_up: ["5 min brisk walk or bike", "Arm circles + bodyweight squats x10"],
            main: [
              { name: "Goblet squat", sets: "3", reps: "10", rest: "60s", intensity: "RPE 7", cue: "Chest up, knees tracking toes" },
              { name: "Dumbbell bench press", sets: "3", reps: "10", rest: "60s", intensity: "RPE 7" },
            ],
            accessory: [{ name: "Seated row", sets: "3", reps: "12", rest: "45s", intensity: "RPE 6" }],
            conditioning: [],
            cool_down: ["Standing quad stretch", "Chest doorway stretch"],
          },
          {
            day: "Day 2",
            focus: "Full body — Conditioning",
            duration: "40 min",
            warm_up: ["5 min row or jog"],
            main: [
              { name: "Dumbbell deadlift", sets: "3", reps: "10", rest: "75s", intensity: "RPE 7" },
              { name: "Push-up", sets: "3", reps: "AMRAP", rest: "60s", intensity: "RPE 8" },
            ],
            accessory: [{ name: "Plank", sets: "3", reps: "30s hold", rest: "30s", intensity: "RPE 6" }],
            conditioning: [],
            cool_down: ["Hip flexor stretch", "Child's pose"],
          },
          {
            day: "Day 3",
            focus: "Full body — Strength",
            duration: "45 min",
            warm_up: ["5 min brisk walk", "Band pull-aparts x15"],
            main: [
              { name: "Dumbbell lunge", sets: "3", reps: "10 each leg", rest: "60s", intensity: "RPE 7" },
              { name: "Overhead press", sets: "3", reps: "10", rest: "60s", intensity: "RPE 7" },
            ],
            accessory: [{ name: "Bicep curl", sets: "2", reps: "12", rest: "45s", intensity: "RPE 6" }],
            conditioning: [],
            cool_down: ["Standing hamstring stretch"],
          },
        ],
      },
    ],
    monitoring: {
      weekly_progression: "Review load and RPE each week.",
      load_increase_guidance: "Increase load 2.5-5% once the top of the rep range is hit.",
      deload_guidance: "Deload every 5th week if fatigue accumulates.",
      adjust_signals: "Persistent RPE 9-10 or soreness lasting 72h+.",
      reassessment_date: offsetDate(28),
    },
    programming_notes: ["Preview data — sample plan for local testing."],
    missing_information: [],
    review_status: "Approved",
  };

  const sessions: Row[] = [
    { id: uuid(), plan_id: planId, client_id: sarahId, scheduled_date: offsetDate(-4), week_number: 1, phase_index: 0, day_index: 0, day_label: "Day 1", focus: "Full body — Strength", status: "completed", started_at: offsetIso(-4), completed_at: offsetIso(-4), notes: null, created_at: now, updated_at: now },
    { id: uuid(), plan_id: planId, client_id: sarahId, scheduled_date: offsetDate(-2), week_number: 1, phase_index: 0, day_index: 1, day_label: "Day 2", focus: "Full body — Conditioning", status: "completed", started_at: offsetIso(-2), completed_at: offsetIso(-2), notes: null, created_at: now, updated_at: now },
    { id: uuid(), plan_id: planId, client_id: sarahId, scheduled_date: offsetDate(0), week_number: 1, phase_index: 0, day_index: 2, day_label: "Day 3", focus: "Full body — Strength", status: "scheduled", started_at: null, completed_at: null, notes: null, created_at: now, updated_at: now },
    { id: uuid(), plan_id: planId, client_id: sarahId, scheduled_date: offsetDate(2), week_number: 2, phase_index: 0, day_index: 0, day_label: "Day 1", focus: "Full body — Strength", status: "scheduled", started_at: null, completed_at: null, notes: null, created_at: now, updated_at: now },
  ];

  return {
    trainer_profiles: [
      {
        id: uuid(),
        user_id: adminId,
        full_name: "Alex Rivera",
        avatar_url: null,
        business_name: "Rivera Performance",
        certification_name: "NASM CPT",
        certification_number: "NASM-88213",
        years_experience: 6,
        training_style: "Strength & conditioning",
        measurement_system: "metric",
        onboarded: true,
        accepted_disclaimer: true,
        created_at: now,
        updated_at: now,
      },
    ],
    clients: [
      {
        id: sarahId, trainer_id: adminId, user_id: clientId, email: "preview-client@local.test",
        full_name: "Sarah Chen", avatar_url: null, age: 29, date_of_birth: null, gender: "Female",
        height_cm: 165, weight_kg: 68, occupation: "Software engineer", activity_level: "Lightly active",
        measurement_system: "metric",
        fitness_profile: { primary_goal: "Fat loss", secondary_goals: ["Improve energy"], level: "Beginner", training_history: "New to structured training.", preferred_types: ["Strength"], target_timeline_weeks: "12" },
        body_assessment: { waist_cm: "78", hip_cm: "98", chest_cm: "90", arm_cm: "27", thigh_cm: "55", body_fat_pct: "28", posture_notes: "", mobility_notes: "", bmi: 25 },
        health: { readiness: {}, injuries: "", medical_conditions: "", medications: "", doctor_restrictions: "", pregnancy_postpartum: "", sleep_stress: "" },
        training_setup: { days_per_week: "3", available_days: ["Mon", "Wed", "Fri"], session_length_min: "45", location: "Home", equipment: ["Dumbbells", "Bench"], split_preference: "Full body", cardio_preference: "Light", constraints: "" },
        availability: { preferred_days: ["Mon", "Wed", "Fri"], preferred_time: "Evening", notes: "" },
        health_flagged: false, archived: false, status: "active", hold_reason: null,
        last_activity_at: now, created_at: now, updated_at: now,
      },
      {
        id: johnId, trainer_id: adminId, user_id: null, email: null,
        full_name: "John Doe", avatar_url: null, age: 34, date_of_birth: null, gender: "Male",
        height_cm: 178, weight_kg: 88, occupation: "Teacher", activity_level: "Sedentary",
        measurement_system: "metric",
        fitness_profile: { primary_goal: "Muscle gain", secondary_goals: [], level: "Beginner", training_history: "", preferred_types: ["Strength"], target_timeline_weeks: "16" },
        body_assessment: { waist_cm: "", hip_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", body_fat_pct: "", posture_notes: "", mobility_notes: "", bmi: null },
        health: { readiness: {}, injuries: "", medical_conditions: "", medications: "", doctor_restrictions: "", pregnancy_postpartum: "", sleep_stress: "" },
        training_setup: { days_per_week: "4", available_days: ["Tue", "Thu", "Sat", "Sun"], session_length_min: "60", location: "Gym", equipment: ["Barbell", "Machines"], split_preference: "Upper/lower", cardio_preference: "", constraints: "" },
        availability: { preferred_days: ["Tue", "Thu", "Sat", "Sun"], preferred_time: "Morning", notes: "" },
        health_flagged: false, archived: false, status: "pending", hold_reason: null,
        last_activity_at: now, created_at: now, updated_at: now,
      },
      {
        id: marcusId, trainer_id: adminId, user_id: null, email: null,
        full_name: "Marcus Lee", avatar_url: null, age: 41, date_of_birth: null, gender: "Male",
        height_cm: 180, weight_kg: 92, occupation: "Sales", activity_level: "Moderately active",
        measurement_system: "metric",
        fitness_profile: { primary_goal: "General fitness", secondary_goals: [], level: "Intermediate", training_history: "Former athlete.", preferred_types: ["Strength", "Cardio"], target_timeline_weeks: "12" },
        body_assessment: { waist_cm: "95", hip_cm: "100", chest_cm: "104", arm_cm: "34", thigh_cm: "60", body_fat_pct: "22", posture_notes: "", mobility_notes: "Limited shoulder mobility.", bmi: 28 },
        health: { readiness: {}, injuries: "Right shoulder impingement", medical_conditions: "", medications: "", doctor_restrictions: "Avoid overhead pressing", pregnancy_postpartum: "", sleep_stress: "" },
        training_setup: { days_per_week: "3", available_days: ["Mon", "Thu", "Sat"], session_length_min: "50", location: "Gym", equipment: ["Full gym"], split_preference: "Upper/lower", cardio_preference: "Moderate", constraints: "Shoulder injury" },
        availability: { preferred_days: ["Mon", "Thu", "Sat"], preferred_time: "Evening", notes: "" },
        health_flagged: true, archived: false, status: "on_hold", hold_reason: "Recovering from shoulder injury — resuming after physio clearance.",
        last_activity_at: now, created_at: now, updated_at: now,
      },
    ],
    client_requests: [
      {
        id: uuid(), client_id: johnId, user_id: "preview-lead-john", admin_id: null, status: "pending",
        message: "Looking to build muscle, available evenings and weekends.", rejection_reason: null,
        submitted_at: now, reviewed_at: null, created_at: now, updated_at: now,
      },
    ],
    workout_plans: [
      {
        id: planId, trainer_id: adminId, client_id: sarahId, created_by: adminId,
        title: planContent.title, goal: "Fat loss", version: 1, status: "published",
        content: planContent, trainer_notes: "Great first two weeks — keep an eye on squat depth.",
        approved: true, start_date: offsetDate(-4), end_date: offsetDate(24),
        current_phase: 1, published_at: offsetIso(-4), archived: false,
        created_at: now, updated_at: now,
      },
    ],
    plan_versions: [
      {
        id: uuid(), plan_id: planId, version: 1, title: planContent.title, content: planContent,
        trainer_notes: "Great first two weeks — keep an eye on squat depth.", status: "published", created_at: now,
      },
    ],
    workout_sessions: sessions,
    exercise_completions: [
      { id: uuid(), session_id: sessions[0]!.id, client_id: sarahId, exercise_key: "m0", exercise_name: "Goblet squat", completed: true, completed_at: offsetIso(-4), performance: {} },
      { id: uuid(), session_id: sessions[0]!.id, client_id: sarahId, exercise_key: "m1", exercise_name: "Dumbbell bench press", completed: true, completed_at: offsetIso(-4), performance: {} },
    ],
    progress_entries: [
      { id: uuid(), client_id: sarahId, user_id: clientId, recorded_at: offsetDate(-14), weight_kg: 69.5, body_fat_pct: 29, measurements: {}, note: "Starting point.", created_at: now },
      { id: uuid(), client_id: sarahId, user_id: clientId, recorded_at: offsetDate(-7), weight_kg: 68.8, body_fat_pct: null, measurements: {}, note: null, created_at: now },
      { id: uuid(), client_id: sarahId, user_id: clientId, recorded_at: offsetDate(0), weight_kg: 68, body_fat_pct: 28, measurements: {}, note: "Feeling stronger.", created_at: now },
    ],
    activity_log: [
      { id: uuid(), client_id: sarahId, actor_id: adminId, type: "plan_published", message: `Plan published: ${planContent.title}`, created_at: offsetIso(-4) },
      { id: uuid(), client_id: sarahId, actor_id: clientId, type: "workout_completed", message: "Completed Day 2 workout — Full body — Conditioning", created_at: offsetIso(-2) },
    ],
    notifications: [
      { id: uuid(), recipient_id: adminId, type: "request_new", title: "New client request", message: "John Doe submitted a coaching request.", link: "/admin/requests", read: false, created_at: now },
      { id: uuid(), recipient_id: clientId, type: "plan_published", title: "New plan published", message: `Your coach published "${planContent.title}". Open your plan to get started.`, link: "/app/plan", read: false, created_at: offsetIso(-4) },
    ],
  };
}

function loadDb(): Db {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = buildSeed();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    cache = raw ? (JSON.parse(raw) as Db) : buildSeed();
  } catch {
    cache = buildSeed();
  }
  return cache;
}

function persist() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable — preview data just won't survive a reload.
  }
}

function table(name: string): Row[] {
  const db = loadDb();
  if (!db[name]) db[name] = [];
  return db[name]!;
}

/** Wipes all locally-saved preview data back to the seeded starting point. */
export function resetPreviewData() {
  if (typeof window !== "undefined") window.localStorage.removeItem(DB_KEY);
  cache = null;
}

/* ---------- filter matching ---------- */

type Filter = { col: string; op: "eq" | "in"; val: unknown };

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    if (f.op === "eq") return row[f.col] === f.val;
    return Array.isArray(f.val) && f.val.includes(row[f.col]);
  });
}

function applyEmbeds(rows: Row[], selectCols: string | undefined): Row[] {
  if (!selectCols) return rows;
  const m = selectCols.match(/clients\(([^)]*)\)/);
  if (!m) return rows;
  const inner = (m[1] ?? "").trim();
  const clients = table("clients");
  return rows.map((r) => {
    const client = clients.find((c) => c.id === r.client_id) ?? null;
    let embed: Row | null = null;
    if (client) {
      if (inner === "*" || inner === "") embed = { ...client };
      else {
        embed = {};
        for (const col of inner.split(",").map((s) => s.trim()).filter(Boolean)) embed[col] = client[col];
      }
    }
    return { ...r, clients: embed };
  });
}

/* ---------- table-specific defaults (mirrors real column defaults) ---------- */

function tableDefaults(tbl: string): Row {
  switch (tbl) {
    case "clients":
      return { status: "pending", trainer_id: null, archived: false, health_flagged: false, hold_reason: null, last_activity_at: null, measurement_system: "metric", availability: {} };
    case "client_requests":
      return { status: "pending", admin_id: null, message: null, rejection_reason: null, reviewed_at: null, submitted_at: nowIso() };
    case "workout_plans":
      return { goal: null, trainer_notes: null, start_date: null, end_date: null, current_phase: 1, published_at: null, archived: false };
    case "notifications":
      return { read: false, link: null };
    case "exercise_completions":
      return { completed: true, performance: {}, completed_at: nowIso() };
    case "progress_entries":
      return { body_fat_pct: null, measurements: {}, note: null };
    default:
      return {};
  }
}

/* ---------- trigger-equivalents (mirrors the real schema's notification/activity triggers) ---------- */

function snapshotPlanVersion(row: Row) {
  table("plan_versions").push({
    id: uuid(), plan_id: row.id, version: row.version, title: row.title,
    content: row.content, trainer_notes: row.trainer_notes ?? null, status: row.status, created_at: nowIso(),
  });
}

function logActivity(clientId: string, type: string, message: string, actorId: string | null = null) {
  table("activity_log").unshift({ id: uuid(), client_id: clientId, actor_id: actorId, type, message, created_at: nowIso() });
}

function notify(recipientId: string, type: string, title: string, message: string, link: string | null) {
  table("notifications").unshift({ id: uuid(), recipient_id: recipientId, type, title, message, link, read: false, created_at: nowIso() });
}

function contentChanged(a: Row, b: Row): boolean {
  return JSON.stringify(a.content) !== JSON.stringify(b.content);
}

function afterWorkoutPlansWrite(before: Row | null, after: Row) {
  if (!before || contentChanged(after, before) || after.version !== before.version) {
    snapshotPlanVersion(after);
  }
  if (!before) return;
  const client = table("clients").find((c) => c.id === after.client_id);
  if (!client?.user_id) return;
  if (after.status === "published" && before.status !== "published") {
    notify(client.user_id, "plan_published", "New plan published", `Your coach published "${after.title}". Open your plan to get started.`, "/app/plan");
    logActivity(after.client_id, "plan_published", `Plan published: ${after.title}`);
  } else if (after.status === "published" && contentChanged(after, before)) {
    notify(client.user_id, "plan_updated", "Plan updated", `Your coach updated "${after.title}".`, "/app/plan");
    logActivity(after.client_id, "plan_updated", `Plan updated: ${after.title}`);
  }
}

function afterClientsWrite(before: Row | null, after: Row) {
  if (!before || after.status === before.status || !after.user_id) return;
  if (after.status === "on_hold") {
    notify(after.user_id, "account_on_hold", "Account on hold", "Your account is currently on hold. Please contact your coach for more information.", "/app");
    logActivity(after.id, "on_hold", "Account placed on hold");
  } else if (after.status === "active" && (before.status === "on_hold" || before.status === "archived")) {
    notify(after.user_id, "account_reactivated", "Account reactivated", "Your account is active again. Your plan is available.", "/app");
    logActivity(after.id, "reactivated", "Account reactivated");
  }
}

function afterClientRequestsInsert(row: Row) {
  const client = table("clients").find((c) => c.id === row.client_id);
  notify(PREVIEW_USER_ID.admin, "request_new", "New client request", `${client?.full_name ?? "A client"} submitted a coaching request.`, "/admin/requests");
  logActivity(row.client_id, "request_submitted", "Submitted a coaching request");
}

function afterClientRequestsUpdate(before: Row, after: Row) {
  if (after.status === before.status) return;
  const clients = table("clients");
  const idx = clients.findIndex((c) => c.id === after.client_id);
  if (after.status === "accepted") {
    if (idx >= 0) clients[idx] = { ...clients[idx], status: "active", trainer_id: after.admin_id ?? PREVIEW_USER_ID.admin, updated_at: nowIso() };
    notify(after.user_id, "request_accepted", "Request accepted", "Your coach accepted your request. Your personalised plan is on its way.", "/app");
    logActivity(after.client_id, "request_accepted", "Request accepted by coach");
  } else if (after.status === "rejected") {
    if (idx >= 0) clients[idx] = { ...clients[idx], status: "rejected", updated_at: nowIso() };
    notify(after.user_id, "request_rejected", "Request not accepted", after.rejection_reason || "Your coach could not accept your request at this time.", "/app");
    logActivity(after.client_id, "request_rejected", "Request declined by coach");
  }
}

function afterSessionsUpdate(before: Row, after: Row) {
  if (after.status === before.status) return;
  if (after.status === "completed") {
    const client = table("clients").find((c) => c.id === after.client_id);
    logActivity(after.client_id, "workout_completed", `Completed ${after.day_label} workout — ${after.focus}`);
    notify(PREVIEW_USER_ID.admin, "workout_completed", "Workout completed", `${client?.full_name ?? "A client"} completed ${after.day_label} — ${after.focus}.`, `/clients/${after.client_id}`);
  } else if (after.status === "in_progress") {
    logActivity(after.client_id, "workout_started", `Started ${after.day_label} workout`);
  }
}

function afterProgressInsert(row: Row) {
  logActivity(row.client_id, "progress_logged", row.weight_kg != null ? `Updated weight to ${row.weight_kg} kg` : "Logged a progress entry");
}

/* ---------- query builder ---------- */

type SelectOpts = { count?: "exact"; head?: boolean };
type Op = "select" | "insert" | "update" | "upsert" | "delete";

class PreviewQuery implements PromiseLike<{ data: any; error: null; count?: number }> {
  private tbl: string;
  private op: Op | null = null;
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private single = false;
  private selectCols: string | undefined;
  private selectOpts: SelectOpts | undefined;
  private payload: Row[] = [];
  private onConflict: string | undefined;

  constructor(tbl: string) {
    this.tbl = tbl;
  }

  select(cols?: string, opts?: SelectOpts) {
    if (!this.op) this.op = "select";
    this.selectCols = cols;
    this.selectOpts = opts;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = [patch];
    return this;
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.onConflict = opts?.onConflict;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }
  in(col: string, val: unknown[]) {
    this.filters.push({ col, op: "in", val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }

  private runSideEffects(op: Op, before: Row | null, after: Row) {
    if (op === "insert") {
      if (this.tbl === "workout_plans") afterWorkoutPlansWrite(null, after);
      if (this.tbl === "client_requests") afterClientRequestsInsert(after);
      if (this.tbl === "progress_entries") afterProgressInsert(after);
    } else if (op === "update" && before) {
      if (this.tbl === "workout_plans") afterWorkoutPlansWrite(before, after);
      if (this.tbl === "clients") afterClientsWrite(before, after);
      if (this.tbl === "client_requests") afterClientRequestsUpdate(before, after);
      if (this.tbl === "workout_sessions") afterSessionsUpdate(before, after);
    }
  }

  private execute(): { data: any; error: null; count?: number } {
    const rows = table(this.tbl);

    if (this.op === "insert") {
      const inserted = this.payload.map((r) => {
        const row = { id: uuid(), created_at: nowIso(), updated_at: nowIso(), ...tableDefaults(this.tbl), ...r };
        rows.push(row);
        this.runSideEffects("insert", null, row);
        return row;
      });
      persist();
      return this.finish(inserted);
    }

    if (this.op === "update") {
      const matched = rows.filter((r) => matchesFilters(r, this.filters));
      const results = matched.map((r) => {
        const before = { ...r };
        Object.assign(r, this.payload[0], { updated_at: nowIso() });
        this.runSideEffects("update", before, r);
        return r;
      });
      persist();
      return this.finish(results);
    }

    if (this.op === "upsert") {
      const conflictCols = (this.onConflict ?? "id").split(",").map((s) => s.trim());
      const results = this.payload.map((incoming) => {
        const existing = rows.find((r) => conflictCols.every((c) => r[c] === incoming[c]));
        if (existing) {
          Object.assign(existing, incoming, { updated_at: nowIso() });
          return existing;
        }
        const row = { id: uuid(), created_at: nowIso(), updated_at: nowIso(), ...tableDefaults(this.tbl), ...incoming };
        rows.push(row);
        return row;
      });
      persist();
      return this.finish(results);
    }

    if (this.op === "delete") {
      const matched = rows.filter((r) => matchesFilters(r, this.filters));
      const keep = rows.filter((r) => !matchesFilters(r, this.filters));
      rows.length = 0;
      rows.push(...keep);
      persist();
      return this.finish(matched);
    }

    // select (default when no mutation op was set)
    let result = rows.filter((r) => matchesFilters(r, this.filters));
    if (this.selectOpts?.head) {
      return { data: null, error: null, count: result.length };
    }
    result = applyEmbeds(result, this.selectCols);
    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      result = [...result].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * (asc ? 1 : -1);
      });
    }
    if (this.limitN != null) result = result.slice(0, this.limitN);
    return this.finish(result, this.selectOpts?.count === "exact" ? rows.filter((r) => matchesFilters(r, this.filters)).length : undefined);
  }

  private finish(rows: Row[], count?: number): { data: any; error: null; count?: number } {
    const data = this.single ? (rows[0] ? { ...rows[0] } : null) : rows.map((r) => ({ ...r }));
    return count === undefined ? { data, error: null } : { data, error: null, count };
  }

  then<T1 = any, T2 = never>(
    onFulfilled?: ((value: { data: any; error: null; count?: number }) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onFulfilled, onRejected);
  }
}

export function previewFrom(tbl: string): any {
  return new PreviewQuery(tbl);
}
