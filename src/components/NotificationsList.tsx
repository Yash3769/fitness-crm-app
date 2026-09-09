import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function NotificationsList({ userId }: { userId?: string | undefined }) {
  const { data, isLoading } = useNotifications(userId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const unread = (data ?? []).filter((n) => !n.read);

  async function markAll() {
    if (!unread.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", unread.map((n) => n.id));
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function open(id: string, link: string | null, read: boolean) {
    if (!read) {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (link && link.startsWith("/")) navigate({ to: link });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={markAll} disabled={!unread.length}>
          <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
        </Button>
      </div>
      {isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
      {!isLoading && !(data ?? []).length && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">You're all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">Updates about requests, plans and workouts appear here.</p>
        </div>
      )}
      {(data ?? []).map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => open(n.id, n.link, n.read)}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
            n.read ? "border-border bg-surface" : "border-primary/40 bg-primary/5",
          )}
        >
          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-border" : "bg-primary")} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{n.title}</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>
            <span className="mt-1.5 block text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {new Date(n.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
