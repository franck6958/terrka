import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// État vide réutilisable (charte §6) — neutre, jamais alarmant, action optionnelle.
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card flex flex-col items-center justify-center gap-3 p-10 text-center",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
        <Icon size={24} aria-hidden />
      </span>
      <div>
        <h3 className="text-ink">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
