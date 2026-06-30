"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, User } from "lucide-react";
import { Logo } from "./Logo";
import { NAV, isActive } from "@/lib/nav";
import { canAccess } from "@/lib/rbac";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

// Tiroir de navigation mobile (< lg) — overlay accessible (Échap, clic extérieur).
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = NAV.filter((item) => !user || canAccess(user.role, item.href));

  // Fermeture à la touche Échap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Empêche le défilement de l'arrière-plan quand le tiroir est ouvert.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className={cn("lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Panneau */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation principale"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Logo size={30} onDark showTagline={false} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-9 w-9 items-center justify-center rounded-control text-white/80 hover:bg-white/10"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/profil"
            onClick={onClose}
            aria-current={isActive("/profil", pathname) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
              isActive("/profil", pathname)
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <User size={18} aria-hidden />
            Mon profil
          </Link>
        </div>
      </aside>
    </div>
  );
}
