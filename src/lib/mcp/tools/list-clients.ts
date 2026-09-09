import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_clients",
  title: "List clients",
  description: "List the signed-in trainer's clients, newest activity first.",
  inputSchema: {
    search: z.string().optional().describe("Optional name filter."),
    include_archived: z.boolean().optional().describe("Include archived clients."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, include_archived }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("clients")
      .select("id, full_name, age, gender, health_flagged, archived, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (!include_archived) q = q.eq("archived", false);
    if (search) q = q.ilike("full_name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { clients: data ?? [] },
    };
  },
});
