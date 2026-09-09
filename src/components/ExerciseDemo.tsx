import { Dumbbell, ExternalLink } from "lucide-react";
import type { PlanExercise } from "@/lib/plan-types";
import { cn } from "@/lib/utils";

function safeUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function ExerciseDemo({ ex, compact }: { ex: PlanExercise; compact?: boolean }) {
  const url = safeUrl(ex.demo_url);
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise form`)}`;
  const type = ex.demo_type ?? (url && /\.(mp4|webm|mov)(\?|$)/i.test(url) ? "video" : "image");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface",
        compact ? "aspect-[16/9]" : "aspect-[4/3]",
      )}
    >
      {url && type === "video" ? (
        <video src={url} controls playsInline loop muted className="h-full w-full object-cover" />
      ) : url ? (
        <img src={url} alt={`${ex.name} demonstration`} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary via-surface to-background p-5 text-center">
          <span className="glow-primary flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Dumbbell className="h-7 w-7" />
          </span>
          <p className="font-display text-base font-bold uppercase tracking-wide">{ex.name}</p>
          {!compact && (
            <a
              href={search}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Watch a demonstration <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
