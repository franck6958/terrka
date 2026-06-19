"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { STATUS } from "@/lib/status";
import type { Projet, StatusKey } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import { canManageProjets } from "@/lib/rbac";
import { StatusBadge } from "./StatusBadge";

const ORDER: StatusKey[] = ["ontime", "risk", "late", "paused", "done"];

// Badge d'état cliquable : ouvre un menu pour changer le statut du projet.
// Repli en badge lecture seule si l'utilisateur n'a pas le droit de gérer les projets.
export function StatusBadgeMenu({ projet }: { projet: Projet }) {
  const { user } = useAuth();
  const { setProjetStatut } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user || !canManageProjets(user.role)) {
    return <StatusBadge statut={projet.statut} />;
  }

  const s = STATUS[projet.statut];
  const Icon = s.icon;

  async function choisir(statut: StatusKey) {
    setOpen(false);
    if (statut === projet.statut) return;
    setBusy(true);
    await setProjetStatut(projet.id, statut);
    setBusy(false);
  }

  return (
    <div className="pointer-events-auto relative z-20" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-label={`Changer le statut (actuel : ${s.label})`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-shadow hover:ring-2 hover:ring-brand-interactive/30 disabled:opacity-60",
          s.bg,
          s.text
        )}
      >
        <Icon size={13} strokeWidth={2.2} aria-hidden />
        {s.label}
        <ChevronDown size={12} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lg"
        >
          {ORDER.map((key) => {
            const o = STATUS[key];
            const OIcon = o.icon;
            const courant = key === projet.statut;
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => choisir(key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface"
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", o.bg, o.text)}>
                  <OIcon size={12} strokeWidth={2.2} aria-hidden />
                </span>
                <span className="flex-1">{o.label}</span>
                {courant && <Check size={14} className="text-brand-interactive" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
