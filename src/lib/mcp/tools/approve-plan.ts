import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { buildSessions, todayIso } from "../../scheduling";
import type { WorkoutPlanContent } from "../../plan-types";

export default defineTool({
  name: "approve_plan",
  title: "Approve & publish workout plan",
  description:
    "Publish a draft workout plan to its client, scheduling dated training sessions from a start date. Only a certified trainer reviewing the plan should do this.",
  inputSchema: {
    plan_id: z.string().describe("Workout plan id."),
    trainer_notes: z.string().optional().describe("Optional review notes to store with the plan."),
    start_date: z.string().optional().describe("ISO date (YYYY-MM-DD) the schedule should start from. Defaults to today."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ plan_id, trainer_notes, start_date }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);

    const { data: plan, error: planErr } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();
    if (planErr) return { content: [{ type: "text", text: planErr.message }], isError: true };
    if (!plan) return { content: [{ type: "text", text: "Plan not found" }], isError: true };

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, availability, training_setup")
      .eq("id", plan.client_id)
      .maybeSingle();
    if (clientErr) return { content: [{ type: "text", text: clientErr.message }], isError: true };
    if (!client) return { content: [{ type: "text", text: "Client not found" }], isError: true };

    const iso = start_date ?? todayIso();
    const start = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(start.getTime()))
      return { content: [{ type: "text", text: "Invalid start_date" }], isError: true };

    const preferredDays: string[] =
      (client.availability as { preferred_days?: string[] } | null)?.preferred_days ??
      (client.training_setup as { available_days?: string[] } | null)?.available_days ??
      [];
    const { rows, endDate } = buildSessions(
      plan_id,
      plan.client_id,
      plan.content as WorkoutPlanContent,
      start,
      preferredDays,
    );
    if (!rows.length)
      return { content: [{ type: "text", text: "This plan has no training days to schedule." }], isError: true };

    const { error: sessErr } = await supabase.from("workout_sessions").insert(rows);
    if (sessErr) return { content: [{ type: "text", text: sessErr.message }], isError: true };

    const patch: Record<string, unknown> = {
      status: "published",
      approved: true,
      published_at: new Date().toISOString(),
      start_date: iso,
      end_date: endDate,
    };
    if (trainer_notes !== undefined) patch["trainer_notes"] = trainer_notes;
    const { data, error } = await supabase
      .from("workout_plans")
      .update(patch)
      .eq("id", plan_id)
      .select("id, title, status, approved, start_date, end_date")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Plan not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ plan: data, sessions_scheduled: rows.length }) }],
      structuredContent: { plan: data, sessions_scheduled: rows.length },
    };
  },
});
