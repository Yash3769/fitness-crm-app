import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_plans",
  title: "List workout plans",
  description: "List the trainer's workout plans, optionally filtered to one client.",
  inputSchema: {
    client_id: z.string().optional().describe("Filter to a single client id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("workout_plans")
      .select("id, client_id, title, version, status, approved, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (client_id) q = q.eq("client_id", client_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { plans: data ?? [] },
    };
  },
});
