import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { IntakeForm, intakeFromClient, intakeToClientRow, type IntakeValues } from "@/components/IntakeForm";
import { useSession } from "@/hooks/useSession";
import { useMyClient } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({
    meta: [
      { title: "Tell your coach about you — Fitness CRM" },
      {
        name: "description",
        content: "Share your goals, body assessment, readiness and availability so your coach can build your plan.",
      },
      { property: "og:title", content: "Tell your coach about you" },
      { property: "og:description", content: "A guided intake for new and returning clients." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: client, isLoading } = useMyClient(user?.id);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <AppShell area="client" hideNav>
        <div className="py-10" />
      </AppShell>
    );
  }

  async function submit(values: IntakeValues) {
    if (!user) return;
    setSaving(true);
    const row = intakeToClientRow(values);
    try {
      if (!client) {
        const { data, error } = await supabase
          .from("clients")
          .insert({ ...row, user_id: user.id, email: user.email ?? null })
          .select("id")
          .maybeSingle();
        if (error || !data) throw error ?? new Error("insert failed");
        const { error: reqErr } = await supabase
          .from("client_requests")
          .insert({ client_id: data.id, user_id: user.id, message: values.message.trim() || null });
        if (reqErr) throw reqErr;
      } else if (client.status === "rejected") {
        const { error } = await supabase.from("clients").update(row).eq("id", client.id);
        if (error) throw error;
        const { error: reqErr } = await supabase
          .from("client_requests")
          .insert({ client_id: client.id, user_id: user.id, message: values.message.trim() || null });
        if (reqErr) throw reqErr;
      } else {
        const { error } = await supabase.from("clients").update(row).eq("id", client.id);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["my-client"] });
      qc.invalidateQueries({ queryKey: ["my-requests"] });
      toast.success(!client || client.status === "rejected" ? "Request sent to your coach." : "Profile updated.");
      navigate({ to: "/app", replace: true });
    } catch {
      toast.error("Could not save your details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const showMessage = !client || client.status === "rejected";
  const initial = client ? intakeFromClient(client) : undefined;

  return (
    <AppShell
      area="client"
      title={showMessage ? "Tell your coach about you" : "Edit your profile"}
      subtitle={showMessage ? "A few quick steps so your coach can build a plan that fits you." : undefined}
      hideNav
    >
      <IntakeForm
        initial={initial}
        submitLabel={showMessage ? "Submit request" : "Save changes"}
        saving={saving}
        showMessage={showMessage}
        onSubmit={submit}
        onCancel={() => navigate({ to: "/app" })}
      />
    </AppShell>
  );
}
