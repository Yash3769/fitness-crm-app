import { formatDate } from "@/lib/scheduling";

export function WeightChart({
  points,
  unit = "kg",
}: {
  points: { date: string; value: number }[];
  unit?: string;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
        Log at least two entries to see a trend line.
      </div>
    );
  }
  const W = 320;
  const H = 140;
  const padX = 12;
  const padY = 16;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => padX + (i / (points.length - 1)) * (W - padX * 2);
  const y = (v: number) => H - padY - ((v - min) / span) * (H - padY * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${d} L${x(points.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const delta = last.value - first.value;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="display-xl text-[2rem]">
          {last.value}
          <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
        </p>
        <p className={delta <= 0 ? "text-sm font-semibold text-success" : "text-sm font-semibold text-warning-foreground"}>
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)} {unit} since {formatDate(first.date, { day: "numeric", month: "short" })}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-36 w-full" role="img" aria-label="Weight trend">
        <defs>
          <linearGradient id="wc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wc-fill)" />
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="var(--background)" stroke="var(--primary)" strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between text-[0.65rem] text-muted-foreground">
        <span>{formatDate(first.date, { day: "numeric", month: "short" })}</span>
        <span>{formatDate(last.date, { day: "numeric", month: "short" })}</span>
      </div>
    </div>
  );
}
