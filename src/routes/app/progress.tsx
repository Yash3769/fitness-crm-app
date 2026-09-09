import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { WeightChart } from "@/components/WeightChart";
import { Field } from "@/components/FormBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/useSession";
import { useMyClient, useProgressEntries } from "@/lib/queries";
import { formatDate, todayIso } from "@/lib/scheduling";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/progress")({
  head: () => ({
    meta: [
      { title: "My progress — Fitness CRM" },
      { name: "description", content: "Log your weight and track your trend over time." },
      { property: "og:title", content: "My progress — Fitness CRM" },
      { property: "og:description", content: "Weight logging and trend chart." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: client, isLoading: clientLoading } = useMyClient(user?.id);
  const { data: entries, isLoading: entriesLoading } = useProgressEntries(client?.id);

  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const unit = "kg";
  const weightPoints = (entries ?? [])
    .filter((e) => e.weight_kg !== null)
    .map((e) => ({ date: e.recorded_at, value: Number(e.weight_kg) }));

  async function submit() {
    if (!user || !client) return;
    if (!weight && !bodyFat && !note.trim()) {
      toast.error("Add a weight, body fat % or note.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("progress_entries").insert({
      client_id: client.id,
      user_id: user.id,
      recorded_at: date,
      weight_kg: weight ? Number(weight) : null,
      body_fat_pct: bodyFat ? Number(bodyFat) : null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save this entry.");
      return;
    }
    setWeight("");
    setBodyFat("");
    setNote("");
    qc.invalidateQueries({ queryKey: ["progress", client.id] });
    toast.success("Progress logged.");
  }

  if (clientLoading) {
    return (
      <AppShell area="client" title="Progress">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </AppShell>
    );
  }

  return (
    <AppShell area="client" title="Progress" subtitle="Log your weight to see your trend over time.">
      <section className="panel p-4">
        <WeightChart points={weightPoints} unit={unit} />
      </section>

      <section className="mt-5 space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold">Log an entry</h2>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Weight (${unit})`}>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label="Body fat (%)" hint="Optional">
            <Input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
          </Field>
        </div>
        <Field label="Note" hint="Optional">
          <Textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Log entry
        </Button>
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="eyebrow">History</h2>
        {entriesLoading && <Skeleton className="h-16 w-full rounded-2xl" />}
        {!entriesLoading && !(entries ?? []).length && (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        )}
        {[...(entries ?? [])].reverse().map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{formatDate(e.recorded_at)}</p>
              {e.note && <p className="truncate text-xs text-muted-foreground">{e.note}</p>}
            </div>
            <p className="text-sm font-semibold">
              {e.weight_kg ? `${e.weight_kg} ${unit}` : ""}
              {e.body_fat_pct ? ` · ${e.body_fat_pct}%` : ""}
            </p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
