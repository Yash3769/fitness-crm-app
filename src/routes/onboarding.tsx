import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useSaveTrainerProfile, useTrainerProfile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINING_STYLES } from "@/lib/domain";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your trainer profile" },
      {
        name: "description",
        content: "Add your certification, experience and preferences before building client plans.",
      },
      { property: "og:title", content: "Set up your trainer profile" },
      { property: "og:description", content: "Trainer onboarding for AI workout planning." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const { data: profile } = useTrainerProfile(user?.id);
  const save = useSaveTrainerProfile(user?.id);
  const [prefilled, setPrefilled] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    business_name: "",
    certification_name: "",
    certification_number: "",
    years_experience: "",
    training_style: "",
    measurement_system: "metric",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { next: undefined, role: undefined }, replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile?.onboarded) navigate({ to: "/", replace: true });
  }, [profile?.onboarded, navigate]);

  // Prefill the form once when the trainer's data first loads. Deliberately does not re-run on
  // every profile/user re-render (Supabase hands back a new session/user object on background
  // auth events like token refresh) — otherwise it would overwrite whatever the trainer is typing.
  useEffect(() => {
    if (prefilled) return;
    if (profile) {
      setForm((f) => ({
        ...f,
        full_name: profile.full_name || (user?.user_metadata?.["full_name"] as string) || "",
        avatar_url: profile.avatar_url || (user?.user_metadata?.["avatar_url"] as string) || "",
      }));
      setPrefilled(true);
    } else if (user) {
      setForm((f) => ({
        ...f,
        full_name: (user.user_metadata?.["full_name"] as string) || "",
        avatar_url: (user.user_metadata?.["avatar_url"] as string) || "",
      }));
      setPrefilled(true);
    }
  }, [profile, user, prefilled]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.full_name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    try {
      await save.mutateAsync({
        full_name: form.full_name.trim().slice(0, 120),
        avatar_url: form.avatar_url || null,
        business_name: form.business_name.trim() || null,
        certification_name: form.certification_name.trim() || null,
        certification_number: form.certification_number.trim() || null,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        training_style: form.training_style || null,
        measurement_system: form.measurement_system,
        onboarded: true,
        accepted_disclaimer: true,
      });
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not save your profile. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="app-shell py-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Set up your trainer profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create personalised workout plans faster. AI prepares the first draft; you review and
          approve every plan.
        </p>

        <div className="mt-8 space-y-5">
          <Field label="Trainer name" required>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} />
          </Field>
          <Field label="Profile photo URL" hint="Optional">
            <Input
              value={form.avatar_url}
              onChange={(e) => set("avatar_url", e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <Field label="Gym or business name" hint="Optional">
            <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} maxLength={120} />
          </Field>
          <Field label="Certification name" hint="Optional">
            <Input
              value={form.certification_name}
              onChange={(e) => set("certification_name", e.target.value)}
              placeholder="K11, REPS India, ACE..."
              maxLength={120}
            />
          </Field>
          <Field label="Certification number" hint="Optional">
            <Input
              value={form.certification_number}
              onChange={(e) => set("certification_number", e.target.value)}
              maxLength={60}
            />
          </Field>
          <Field label="Years of experience">
            <Input
              type="number"
              min={0}
              max={60}
              value={form.years_experience}
              onChange={(e) => set("years_experience", e.target.value)}
            />
          </Field>
          <Field label="Preferred training style">
            <Select value={form.training_style} onValueChange={(v) => set("training_style", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default measurement system">
            <Select
              value={form.measurement_system}
              onValueChange={(v) => set("measurement_system", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric (kg / cm)</SelectItem>
                <SelectItem value="imperial">Imperial (lb / in)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Button className="mt-8 h-13 w-full text-base" onClick={submit} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Finish setup
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
