import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_plan",
  title: "Get workout plan",
  description: "Fetch one workout plan including its full structured programme content.",
  inputSchema: { plan_id: z.string().describe("Workout plan id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ plan_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("id", plan_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Plan not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { plan: data },
    };
  },
});
