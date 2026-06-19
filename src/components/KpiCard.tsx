import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "ontime" | "risk" | "late";
}) {
  const toneCfg = {
    brand: "text-brand-interactive bg-brand-interactive/10",
    ontime: "text-state-ontime bg-state-ontime/10",
    risk: "text-state-risk bg-state-risk/10",
    late: "text-state-late bg-state-late/10",
  }[tone];

  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-control", toneCfg)}>
        <Icon size={22} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-wide text-muted">{label}</p>
        <p className="kpi text-2xl">{value}</p>
        {hint && <p className="truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}
