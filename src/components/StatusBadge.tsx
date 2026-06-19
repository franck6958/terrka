import { STATUS } from "@/lib/status";
import type { StatusKey } from "@/lib/types";
import { cn } from "@/lib/cn";

// Badge d'état (charte §5.1) : couleur + libellé + icône (jamais la couleur seule).
export function StatusBadge({ statut, className }: { statut: StatusKey; className?: string }) {
  const s = STATUS[statut];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        s.bg,
        s.text,
        className
      )}
    >
      <Icon size={13} strokeWidth={2.2} aria-hidden />
      {s.label}
    </span>
  );
}
