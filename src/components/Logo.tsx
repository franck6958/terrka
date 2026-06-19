import { cn } from "@/lib/cn";

/**
 * Logo TREKKA — symbole + signature (charte §2).
 * Tracé jalonné de points dont le dernier, en ambre, marque l'étape validée.
 */
export function LogoMark({
  size = 40,
  variant = "default",
  className,
}: {
  size?: number;
  variant?: "default" | "mono";
  className?: string;
}) {
  const square = variant === "mono" ? "#1D2433" : "#1B3A6B";
  const trace = variant === "mono" ? "#FFFFFF" : "#F2A20C";
  const dotEnd = variant === "mono" ? "#FFFFFF" : "#F2A20C";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="TREKKA"
      className={className}
    >
      <rect width="48" height="48" rx="12" fill={square} />
      <polyline
        points="12,32 20,26 28,30 36,16"
        stroke={trace}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="32" r="3" fill="#FFFFFF" />
      <circle cx="36" cy="16" r="4.5" fill={dotEnd} stroke={square} strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({
  size = 36,
  showTagline = true,
  onDark = false,
  className,
}: {
  size?: number;
  showTagline?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} variant={onDark ? "default" : "default"} />
      <div className="leading-none">
        <span
          className={cn(
            "font-heading font-semibold tracking-[0.12em]",
            onDark ? "text-white" : "text-brand"
          )}
          style={{ fontSize: size * 0.5 }}
        >
          TREKKA
        </span>
        {showTagline && (
          <span
            className={cn(
              "block font-sans tracking-wide",
              onDark ? "text-white/70" : "text-muted"
            )}
            style={{ fontSize: size * 0.22 }}
          >
            Suivi des projets d&apos;infrastructures
          </span>
        )}
      </div>
    </div>
  );
}
