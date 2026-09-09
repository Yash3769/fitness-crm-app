import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle, PenSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/HealthAlert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/FormBits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/lib/queries";
import { generatePlan } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { emptyPlan, type WorkoutPlanContent } from "@/lib/plan-types";
import { toast } from "sonner";

type Search = { clientId?: string | undefined };

export const Route = createFileRoute("/generate/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    clientId: typeof search["clientId"] === "string" ? search["clientId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Generate a workout plan — AI Workout Plan Builder" },
      {
        name: "description",
        content:
          "Pick a client, add trainer instructions and generate a phase-wise plan draft for your review.",
      },
      { property: "og:title", content: "Generate a workout plan" },
      {
        property: "og:description",
        content: "AI prepares the first draft; you review and approve every plan.",
      },
    ],
  }),
  component: GeneratePage,
});

function GeneratePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: clients } = useClients();
  const run = useServerFn(generatePlan);

  const [clientId, setClientId] = useState(search.clientId ?? "");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [buildingManually, setBuildingManually] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const selected = (clients ?? []).find((c) => c.id === clientId);

  async function buildManually() {
    if (!clientId) {
      toast.error("Select a client first.");
      return;
    }
    setBuildingManually(true);
    try {
      const { count } = await supabase
        .from("workout_plans")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId);
      const content = emptyPlan(selected?.full_name ?? "Client");
      const { data, error } = await supabase
        .from("workout_plans")
        .insert({
          trainer_id: user!.id,
          client_id: clientId,
          title: content.title,
          version: (count ?? 0) + 1,
          status: "draft",
          content: content as unknown as never,
          approved: false,
        })
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error("save failed");
      navigate({ to: "/plans/$planId", params: { planId: data.id }, search: { edit: true } });
    } catch {
      toast.error("Could not start a manual plan. Please try again.");
    } finally {
      setBuildingManually(false);
    }
  }

  async function generate() {
    if (!clientId) {
      toast.error("Select a client first.");
      return;
    }
    setBusy(true);
    setRefusal(null);
    try {
      const result = await run({
        data: instruction.trim()
          ? { clientId, instruction: instruction.trim() }
          : { clientId },
      });
      const content = JSON.parse(result.planJson) as WorkoutPlanContent;

      if (content.refused) {
        setRefusal(
          content.refusal_message ??
            "This client's health information requires medical clearance before a plan can be prepared.",
        );
        return;
      }

      const { count } = await supabase
        .from("workout_plans")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId);

      const { data, error } = await supabase
        .from("workout_plans")
        .insert({
          trainer_id: user!.id,
          client_id: clientId,
          title: content.title || `${result.clientName} training plan`,
          version: (count ?? 0) + 1,
          status: "draft",
          content: content as unknown as never,
          approved: false,
        })
        .select("id")
        .maybeSingle();

      if (error || !data) throw new Error("save failed");
      navigate({ to: "/plans/$planId", params: { planId: data.id } });
    } catch {
      toast.error("Plan generation failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell area="admin"
      title="Generate plan"
      subtitle="AI prepares the first draft; you review and approve every plan."
    >
      <div className="space-y-5">
        <Field label="Client" required>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {(clients ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {selected && (
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm shadow-card">
            <p className="font-semibold">{selected.full_name}</p>
            <p className="mt-1 text-muted-foreground">
              {selected.fitness_profile?.primary_goal ?? "Goal not set"} ·{" "}
              {selected.fitness_profile?.level ?? "Level not set"} ·{" "}
              {selected.training_setup?.days_per_week ?? "?"} days/week ·{" "}
              {selected.training_setup?.location ?? "Location not set"}
            </p>
          </div>
        )}

        <Field label="Trainer instructions" hint="Optional">
          <Textarea
            rows={4}
            maxLength={800}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Emphasise posterior chain, avoid overhead pressing, keep sessions under 50 minutes."
          />
        </Field>

        {refusal && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/15 p-4 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{refusal}</p>
          </div>
        )}

        <Button size="lg" className="h-13 w-full text-base" onClick={generate} disabled={busy || buildingManually}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {busy ? "Building the draft…" : "Generate with AI"}
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-13 w-full text-base"
          onClick={buildManually}
          disabled={busy || buildingManually}
        >
          {buildingManually ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PenSquare className="mr-2 h-4 w-4" />
          )}
          Build manually
        </Button>

        <Disclaimer />
      </div>
    </AppShell>
  );
}
