import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClients from "./tools/list-clients";
import getClient from "./tools/get-client";
import listPlans from "./tools/list-plans";
import getPlan from "./tools/get-plan";
import approvePlan from "./tools/approve-plan";


const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "ai-trainer-assist",
  title: "AI Trainer Assist",
  version: "0.1.0",
  instructions:
    "Tools for a certified personal trainer's client and workout-plan workspace. Read client intake profiles and generated plans, and mark a reviewed plan as trainer-approved. These are trainer-facing records, not medical advice — never diagnose or prescribe treatment.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClients, getClient, listPlans, getPlan, approvePlan] as unknown as Parameters<
    typeof defineMcp
  >[0]["tools"],
});
