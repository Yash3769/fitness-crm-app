import { AlertTriangle, ShieldCheck } from "lucide-react";

export function HealthAlert({ flagged }: { flagged: boolean }) {
  if (!flagged) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="text-sm">
          <p className="font-semibold">No readiness flags recorded</p>
          <p className="text-muted-foreground">
            Screening answers did not indicate a flagged risk. Trainer judgement still applies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/15 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
      <div className="text-sm text-warning-foreground">
        <p className="font-semibold">Medical clearance recommended</p>
        <p className="opacity-90">
          The readiness screen indicates possible risk. Plans stay in draft mode and cannot be
          approved until you confirm appropriate clearance has been reviewed.
        </p>
      </div>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      This app is a professional planning assistant, not a medical diagnosis or treatment tool. AI
      prepares the first draft; you review and approve every plan.
    </p>
  );
}
