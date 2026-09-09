import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Dumbbell, Loader2, UserRound, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, homeForRole, setPreviewRole, type AppRole } from "@/hooks/useSession";
import { MOCK_ONLY, NO_SERVER } from "@/lib/preview-mode";
import { bootstrapAdminAccount, signUpClient } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/FormBits";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import heroGym from "@/assets/hero-gym.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Fitness CRM for Coaches & Clients" },
      {
        name: "description",
        content: "Coaches manage clients and publish AI-assisted plans; clients follow workouts and track progress.",
      },
      { property: "og:title", content: "Sign in — Fitness CRM" },
      { property: "og:description", content: "One app for coaches and their clients." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    next:
      typeof search["next"] === "string" && search["next"].startsWith("/") && !search["next"].startsWith("//")
        ? (search["next"] as string)
        : undefined,
    role:
      search["role"] === "admin" || search["role"] === "client"
        ? (search["role"] as "admin" | "client")
        : undefined,
  }),
  component: AuthPage,
});

type Mode = "choose" | "admin" | "client";

function AuthPage() {
  const { session, loading, role, roleLoading } = useSession();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const bootstrap = useServerFn(bootstrapAdminAccount);
  const signUp = useServerFn(signUpClient);

  const [mode, setMode] = useState<Mode>(MOCK_ONLY ? "choose" : (search.role ?? "choose"));
  const [clientTab, setClientTab] = useState<"login" | "signup">(search.role === "client" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && !roleLoading && role) {
      if (search.next) window.location.replace(search.next);
      else navigate({ to: homeForRole(role), replace: true });
    }
  }, [loading, session, role, roleLoading, navigate, search.next]);

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
  }

  function chooseMode(next: Mode) {
    // Mock-only build (GitHub Pages): there's no server to log in against at all, so both
    // top-level buttons jump straight into the local mock experience instead of a real form.
    if (MOCK_ONLY && next !== "choose") {
      preview(next === "admin" ? "admin" : "client");
      return;
    }
    reset();
    setMode(next);
  }

  function preview(role: AppRole) {
    setPreviewRole(role);
    navigate({ to: homeForRole(role), replace: true });
  }

  // Falls back to a plain client-side Supabase signup when the instant-confirm server path
  // isn't available (missing service-role key locally, or no server at all on GitHub Pages).
  // Still a real account and real data — if the project has email confirmation turned on, that
  // means one extra step (click the emailed link once); if it's off, signUp returns an active
  // session immediately and the effect above redirects as soon as role/loading settle.
  async function devSignUpFallback(targetEmail: string, role: AppRole, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email: targetEmail,
      password,
      options: { data: { role, full_name: fullName } },
    });
    if (error && !/already registered|already exists/i.test(error.message)) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created.");
      return;
    }
    toast.success("Account created — check your email (and spam) for a confirmation link, then log in.", {
      duration: 8000,
    });
  }

  function isMissingServiceKey(message: string | undefined) {
    return import.meta.env.DEV && !!message?.includes("SUPABASE_SERVICE_ROLE_KEY");
  }

  async function adminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      let { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        // Static export (GitHub Pages): there's no server at all to call, so skip straight to
        // a plain client-side signup instead of trying (and failing) a server function first.
        if (NO_SERVER) {
          await devSignUpFallback(email.trim(), "admin", "Coach");
          return;
        }
        // First-ever login: silently provision the fixed coach account, then retry once.
        const boot = await bootstrap();
        if (!boot.ok) {
          if (isMissingServiceKey(boot.message)) {
            await devSignUpFallback(email.trim(), "admin", "Coach");
            return;
          }
          toast.error(boot.message ?? "Coach login isn't set up yet. Please try again.");
          return;
        }
        ({ error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }));
      }
      if (error) {
        toast.error("Invalid email or password.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function clientLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) toast.error("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }

  async function clientSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Enter your name, email and password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (NO_SERVER) {
        await devSignUpFallback(email.trim(), "client", name.trim());
        return;
      }
      const result = await signUp({ data: { name: name.trim(), email: email.trim(), password } });
      if (!result.ok) {
        if (isMissingServiceKey(result.message)) {
          await devSignUpFallback(email.trim(), "client", name.trim());
          return;
        }
        toast.error(result.message);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) toast.error("Account created — please log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <img
        src={heroGym}
        alt="Athlete performing a barbell back squat in a dark gym"
        width={1280}
        height={720}
        className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] w-full object-cover opacity-45"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />

      <div className="app-shell relative flex flex-1 flex-col justify-end py-10">
        <div className="glow-primary flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Dumbbell className="h-6 w-6" />
        </div>
        <p className="eyebrow mt-6 text-primary">Fitness CRM</p>
        <h1 className="display-xl mt-2 text-[2.2rem]">
          Coach smarter.
          <br />
          <span className="neon">Train together.</span>
        </h1>

        {mode === "choose" && (
          <div className="mt-8 space-y-4">
            <p className="eyebrow">Continue as</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => chooseMode("client")}
                className="panel flex flex-col items-start gap-2 p-4 text-left transition-colors"
              >
                <UserRound className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold">Client</span>
                <span className="text-xs text-muted-foreground">Follow my coach's plan</span>
              </button>
              <button
                type="button"
                onClick={() => chooseMode("admin")}
                className="panel flex flex-col items-start gap-2 p-4 text-left transition-colors"
              >
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold">Fitness Coach</span>
                <span className="text-xs text-muted-foreground">Manage clients &amp; plans</span>
              </button>
            </div>

            {MOCK_ONLY && (
              <p className="text-xs text-muted-foreground">
                This is a demo build — no account needed. Your data stays in this browser only.
              </p>
            )}

            {import.meta.env.DEV && !MOCK_ONLY && (
              <div className="rounded-2xl border border-dashed border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  Local testing only — skips real login, no account needed
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => preview("client")}>
                    Preview as Client
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => preview("admin")}>
                    Preview as Coach
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "admin" && (
          <form onSubmit={adminLogin} className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => chooseMode("choose")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <p className="text-sm font-semibold">Fitness Coach login</p>
            <Field label="Email" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" autoComplete="email" />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                autoComplete="current-password"
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className="glow-primary h-13 w-full text-base font-semibold uppercase tracking-wide"
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        )}

        {mode === "client" && (
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => chooseMode("choose")}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <div className="grid grid-cols-2 rounded-xl bg-secondary p-1">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    reset();
                    setClientTab(t);
                  }}
                  className={cn(
                    "rounded-lg py-2 text-sm font-semibold transition-colors",
                    clientTab === t ? "bg-background text-foreground shadow-card" : "text-muted-foreground",
                  )}
                >
                  {t === "login" ? "Log in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={clientTab === "login" ? clientLogin : clientSignup} className="space-y-4">
              {clientTab === "signup" && (
                <Field label="Name" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" maxLength={120} autoComplete="name" />
                </Field>
              )}
              <Field label="Email" required>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" autoComplete="email" />
              </Field>
              <Field label="Password" required>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  autoComplete={clientTab === "login" ? "current-password" : "new-password"}
                />
              </Field>
              <Button
                type="submit"
                size="lg"
                className="glow-primary h-13 w-full text-base font-semibold uppercase tracking-wide"
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {clientTab === "login" ? "Log in" : "Create account"}
              </Button>
            </form>
          </div>
        )}
      </div>
      <p className="app-shell relative pb-8 text-xs leading-relaxed text-muted-foreground">
        Coaches review and approve every plan before it reaches a client. Nothing here replaces medical advice.
      </p>
    </div>
  );
}
