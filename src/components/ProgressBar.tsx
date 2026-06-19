import { cn } from "@/lib/cn";

// Barre de progression — bleu interactif (charte §3.1).
export function ProgressBar({
  value,
  className,
  tone = "interactive",
}: {
  value: number;
  className?: string;
  tone?: "interactive" | "ontime" | "risk" | "late";
}) {
  const fill = {
    interactive: "bg-brand-interactive",
    ontime: "bg-state-ontime",
    risk: "bg-state-risk",
    late: "bg-state-late",
  }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-line", className)}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn("h-full rounded-full transition-all", fill)} style={{ width: `${v}%` }} />
    </div>
  );
}
