import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  active: "border-primary/40 bg-primary/15 text-primary",
  published: "border-primary/40 bg-primary/15 text-primary",
  completed: "border-primary/40 bg-primary/15 text-primary",
  accepted: "border-primary/40 bg-primary/15 text-primary",
  pending: "border-warning/40 bg-warning/15 text-warning-foreground",
  draft: "border-warning/40 bg-warning/15 text-warning-foreground",
  in_progress: "border-warning/40 bg-warning/15 text-warning-foreground",
  on_hold: "border-border bg-secondary text-muted-foreground",
  paused: "border-border bg-secondary text-muted-foreground",
  scheduled: "border-border bg-secondary text-muted-foreground",
  rejected: "border-destructive/40 bg-destructive/15 text-destructive",
  skipped: "border-destructive/40 bg-destructive/15 text-destructive",
  archived: "border-border bg-secondary text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STYLES[status] ?? "", className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
