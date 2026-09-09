import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_client",
  title: "Get client profile",
  description:
    "Fetch one client's full intake profile: demographics, fitness profile, body assessment, readiness/health answers and training setup.",
  inputSchema: { client_id: z.string().describe("Client id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Client not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { client: data },
    };
  },
});
