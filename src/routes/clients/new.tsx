import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IntakeForm, intakeToClientRow } from "@/components/IntakeForm";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/clients/new")({
  head: () => ({
    meta: [
      { title: "Add a client — Fitness CRM" },
      {
        name: "description",
        content: "Capture demographics, goals, body assessment, readiness screening and training setup for a new client.",
      },
      { property: "og:title", content: "Add a client — Fitness CRM" },
      { property: "og:description", content: "A guided intake built for mobile use on the gym floor." },
    ],
  }),
  component: NewClient,
});

function NewClient() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [saving, setSaving] = useState(false);

  async function save(values: Parameters<typeof intakeToClientRow>[0]) {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        ...intakeToClientRow(values),
        trainer_id: user.id,
        status: "active",
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error || !data) {
      toast.error("Could not save this client. Please try again.");
      return;
    }
    toast.success("Client profile saved.");
    navigate({ to: "/clients/$clientId", params: { clientId: data.id } });
  }

  return (
    <AppShell area="admin" title="New client" subtitle="Add a client directly. They're accepted immediately — no request needed.">
      <IntakeForm submitLabel="Save client" saving={saving} onSubmit={save} onCancel={() => navigate({ to: "/clients" })} />
    </AppShell>
  );
}
