import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
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

export function ChipGroup({
  options,
  value,
  onChange,
  multi = true,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
}) {
  function toggle(option: string) {
    if (!multi) {
      onChange(value.includes(option) ? [] : [option]);
      return;
    }
    onChange(
      value.includes(option) ? value.filter((v) => v !== option) : [...value, option],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "min-h-9 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function StepProgress({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-foreground">{labels[step - 1]}</span>
        <span className="text-muted-foreground">
          Step {step} of {total}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}
