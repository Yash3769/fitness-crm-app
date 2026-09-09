import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLAN_SYSTEM_PROMPT, buildProfileBrief, callGateway } from "./ai.server";

type GenerateInput = { clientId: string; instruction?: string; previous?: unknown };

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GenerateInput) => input)
  .handler(async ({ data, context }) => {
    const { data: client, error } = await context.supabase
      .from("clients")
      .select("*")
      .eq("id", data.clientId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!client) throw new Error("Client not found");

    const brief = buildProfileBrief(client);
    const userParts: string[] = [brief];

    if (data.previous) {
      userParts.push(
        "EXISTING PLAN (JSON) — revise it rather than starting over:\n" +
          JSON.stringify(data.previous).slice(0, 60000),
      );
    }
    if (data.instruction) {
      userParts.push("TRAINER REVISION REQUEST: " + data.instruction);
    }

    const content = await callGateway(PLAN_SYSTEM_PROMPT, userParts.join("\n\n"));
    return { planJson: JSON.stringify(content), clientName: client.full_name as string };
  });
