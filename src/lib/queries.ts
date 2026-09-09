import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Trainer (admin) profile ---------- */

export type TrainerProfile = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  business_name: string | null;
  certification_name: string | null;
  certification_number: string | null;
  years_experience: number | null;
  training_style: string | null;
  measurement_system: string;
  onboarded: boolean;
  accepted_disclaimer: boolean;
};

export function useTrainerProfile(userId?: string) {
  return useQuery({
    queryKey: ["trainer-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<TrainerProfile | null> => {
      const { data, error } = await supabase
        .from("trainer_profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as TrainerProfile | null;
    },
  });
}

export function useSaveTrainerProfile(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<TrainerProfile>) => {
      const { error } = await supabase
        .from("trainer_profiles")
        .upsert({ ...values, user_id: userId! }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trainer-profile", userId] }),
  });
}

/* ---------- Clients ---------- */

export type ClientStatus = "pending" | "active" | "on_hold" | "rejected" | "archived";

export type ClientRow = {
  id: string;
  trainer_id: string | null;
  user_id: string | null;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  age: number | null;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  occupation: string | null;
  activity_level: string | null;
  measurement_system: string;
  fitness_profile: any;
  body_assessment: any;
  health: any;
  training_setup: any;
  availability: any;
  health_flagged: boolean;
  archived: boolean;
  status: ClientStatus;
  hold_reason: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<ClientRow[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientRow[];
    },
  });
}

export function useClient(id?: string) {
  return useQuery({
    queryKey: ["client", id],
    enabled: !!id,
    queryFn: async (): Promise<ClientRow | null> => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as unknown as ClientRow | null;
    },
  });
}

/** The signed-in client's own profile row. */
export function useMyClient(userId?: string) {
  return useQuery({
    queryKey: ["my-client", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ClientRow | null> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ClientRow | null;
    },
  });
}

/* ---------- Requests ---------- */

export type RequestRow = {
  id: string;
  client_id: string;
  user_id: string;
  admin_id: string | null;
  status: "pending" | "accepted" | "rejected";
  message: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  clients?: ClientRow | null;
};

export function useRequests(status?: RequestRow["status"]) {
  return useQuery({
    queryKey: ["requests", status ?? "all"],
    queryFn: async (): Promise<RequestRow[]> => {
      let q = supabase
        .from("client_requests")
        .select("*, clients(*)")
        .order("submitted_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RequestRow[];
    },
  });
}

export function useMyRequests(userId?: string) {
  return useQuery({
    queryKey: ["my-requests", userId],
    enabled: !!userId,
    queryFn: async (): Promise<RequestRow[]> => {
      const { data, error } = await supabase
        .from("client_requests")
        .select("*")
        .eq("user_id", userId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RequestRow[];
    },
  });
}

/* ---------- Plans ---------- */

export type PlanStatus = "draft" | "published" | "paused" | "completed" | "archived";

export type PlanRow = {
  id: string;
  trainer_id: string;
  client_id: string;
  created_by: string | null;
  title: string;
  goal: string | null;
  version: number;
  status: PlanStatus;
  content: any;
  trainer_notes: string | null;
  approved: boolean;
  start_date: string | null;
  end_date: string | null;
  current_phase: number;
  published_at: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  clients?: { full_name: string; avatar_url: string | null } | null;
};

export function usePlans(clientId?: string) {
  return useQuery({
    queryKey: ["plans", clientId ?? "all"],
    queryFn: async (): Promise<PlanRow[]> => {
      let q = supabase
        .from("workout_plans")
        .select("*, clients(full_name, avatar_url)")
        .order("created_at", { ascending: false });
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PlanRow[];
    },
  });
}

export function usePlan(id?: string) {
  return useQuery({
    queryKey: ["plan", id],
    enabled: !!id,
    queryFn: async (): Promise<PlanRow | null> => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PlanRow | null;
    },
  });
}

export type PlanVersionRow = {
  id: string;
  plan_id: string;
  version: number;
  title: string;
  content: any;
  trainer_notes: string | null;
  status: string;
  created_at: string;
};

export function usePlanVersions(planId?: string) {
  return useQuery({
    queryKey: ["plan-versions", planId],
    enabled: !!planId,
    queryFn: async (): Promise<PlanVersionRow[]> => {
      const { data, error } = await supabase
        .from("plan_versions")
        .select("*")
        .eq("plan_id", planId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PlanVersionRow[];
    },
  });
}

/* ---------- Sessions & completions ---------- */

export type SessionStatus = "scheduled" | "in_progress" | "completed" | "skipped";

export type SessionRow = {
  id: string;
  plan_id: string;
  client_id: string;
  scheduled_date: string;
  week_number: number;
  phase_index: number;
  day_index: number;
  day_label: string;
  focus: string;
  status: SessionStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
};

export function useSessions(clientId?: string, planId?: string) {
  return useQuery({
    queryKey: ["sessions", clientId ?? "all", planId ?? "all"],
    enabled: clientId !== "",
    queryFn: async (): Promise<SessionRow[]> => {
      let q = supabase.from("workout_sessions").select("*").order("scheduled_date", { ascending: true });
      if (clientId) q = q.eq("client_id", clientId);
      if (planId) q = q.eq("plan_id", planId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SessionRow[];
    },
  });
}

export function useSessionById(id?: string) {
  return useQuery({
    queryKey: ["session", id],
    enabled: !!id,
    queryFn: async (): Promise<SessionRow | null> => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as SessionRow | null;
    },
  });
}

export type CompletionRow = {
  id: string;
  session_id: string;
  client_id: string;
  exercise_key: string;
  exercise_name: string;
  completed: boolean;
  completed_at: string;
  performance: any;
};

export function useCompletions(sessionId?: string) {
  return useQuery({
    queryKey: ["completions", sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<CompletionRow[]> => {
      const { data, error } = await supabase
        .from("exercise_completions")
        .select("*")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return (data ?? []) as unknown as CompletionRow[];
    },
  });
}

export function useClientCompletions(clientId?: string) {
  return useQuery({
    queryKey: ["client-completions", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<CompletionRow[]> => {
      const { data, error } = await supabase
        .from("exercise_completions")
        .select("*")
        .eq("client_id", clientId!)
        .order("completed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as CompletionRow[];
    },
  });
}

/* ---------- Progress entries ---------- */

export type ProgressRow = {
  id: string;
  client_id: string;
  user_id: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  measurements: any;
  note: string | null;
  created_at: string;
};

export function useProgressEntries(clientId?: string) {
  return useQuery({
    queryKey: ["progress", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ProgressRow[]> => {
      const { data, error } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("client_id", clientId!)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProgressRow[];
    },
  });
}

/** All clients' progress entries, for the coach's cross-client overview. */
export function useAllProgress() {
  return useQuery({
    queryKey: ["all-progress"],
    queryFn: async (): Promise<ProgressRow[]> => {
      const { data, error } = await supabase
        .from("progress_entries")
        .select("*")
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProgressRow[];
    },
  });
}

/* ---------- Activity & notifications ---------- */

export type ActivityRow = {
  id: string;
  client_id: string;
  actor_id: string | null;
  type: string;
  message: string;
  created_at: string;
  clients?: { full_name: string } | null;
};

export function useActivity(clientId?: string, limit = 30) {
  return useQuery({
    queryKey: ["activity", clientId ?? "all", limit],
    queryFn: async (): Promise<ActivityRow[]> => {
      let q = supabase
        .from("activity_log")
        .select("*, clients(full_name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ActivityRow[];
    },
  });
}

export type NotificationRow = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    refetchInterval: 30000,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as NotificationRow[];
    },
  });
}

/* ---------- Helpers ---------- */

export function invalidateClientData(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ["clients", "client", "my-client", "requests", "my-requests", "plans", "plan", "sessions", "activity", "notifications"]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}
