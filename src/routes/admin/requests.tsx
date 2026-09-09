import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Loader2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useRequests, invalidateClientData, type RequestRow } from "@/lib/queries";
import { useSession } from "@/hooks/useSession";
import { initials } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/requests")({
  head: () => ({
    meta: [
      { title: "Client requests — Fitness CRM" },
      { name: "description", content: "Review new client sign-ups, accept them into your roster or decline with a reason." },
      { property: "og:title", content: "Client requests — Fitness CRM" },
      { property: "og:description", content: "Accept or decline incoming client requests." },
    ],
  }),
  component: RequestsPage,
});

const TABS = ["pending", "accepted", "rejected"] as const;

function RequestCard({ r, adminId }: { r: RequestRow; adminId?: string }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = r.clients;

  async function review(status: "accepted" | "rejected") {
    setBusy(true);
    const { error } = await supabase
      .from("client_requests")
      .update({
        status,
        admin_id: adminId ?? null,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? reason.trim() || null : null,
      })
      .eq("id", r.id);
    setBusy(false);
    if (error) {
      toast.error("Could not update this request.");
      return;
    }
    invalidateClientData(qc);
    toast.success(status === "accepted" ? "Client accepted. They can now receive a plan." : "Request declined.");
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
          {initials(c?.full_name ?? "?")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-semibold">
            {c?.full_name ?? "Client"}
            {c?.health_flagged && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {c?.fitness_profile?.primary_goal ?? "Goal not set"} · {c?.fitness_profile?.level ?? "Level not set"}
          </p>
        </div>
        <StatusBadge status={r.status} />
      </div>

      {r.message && <p className="mt-3 rounded-xl bg-background p-3 text-sm text-muted-foreground">“{r.message}”</p>}
      {r.rejection_reason && (
        <p className="mt-3 text-xs text-muted-foreground">Reason given: {r.rejection_reason}</p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Submitted {new Date(r.submitted_at).toLocaleDateString()}</span>
        {c && (
          <Link to="/clients/$clientId" params={{ clientId: c.id }} className="flex items-center gap-1 text-primary">
            Full profile <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {r.status === "pending" && (
        <div className="mt-4 space-y-3">
          {rejecting && (
            <Textarea
              rows={2}
              maxLength={400}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: tell the client why (they will see this)."
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            {rejecting ? (
              <>
                <Button variant="outline" onClick={() => setRejecting(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => review("rejected")} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                  Decline
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
                  <X className="mr-2 h-4 w-4" /> Decline
                </Button>
                <Button onClick={() => review("accepted")} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Accept
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestsPage() {
  const { user } = useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const { data, isLoading } = useRequests(tab);

  return (
    <AppShell area="admin" title="Requests" subtitle="New clients who asked to train with you.">
      <div className="grid grid-cols-3 rounded-xl bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg py-2 text-xs font-semibold capitalize transition-colors",
              tab === t ? "bg-background text-foreground shadow-card" : "text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <Skeleton className="h-28 w-full rounded-2xl" />}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="text-sm font-semibold">No {tab} requests.</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Clients who create an account and complete onboarding appear here.
            </p>
          </div>
        )}
        {(data ?? []).map((r) => (
          <RequestCard key={r.id} r={r} adminId={user?.id} />
        ))}
      </div>
    </AppShell>
  );
}
