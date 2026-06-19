"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ROLE_LABEL } from "@/lib/status";
import type { Role, Utilisateur } from "@/lib/types";
import { useStore } from "@/lib/store";

const ROLES = Object.keys(ROLE_LABEL) as Role[];

// Sélecteur de rôle d'un utilisateur (BF-02), affiché dans le tableau des comptes.
// `self` = la ligne de l'utilisateur connecté : non modifiable (anti-verrouillage).
export function RoleSelect({ utilisateur, self = false }: { utilisateur: Utilisateur; self?: boolean }) {
  const { setUtilisateurRole } = useStore();
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

  const badge = (
    <span className="rounded-full bg-brand-interactive/10 px-2.5 py-1 text-xs font-medium text-brand-interactive">
      {ROLE_LABEL[utilisateur.role]}
    </span>
  );

  // Rôle non modifiable pour son propre compte.
  if (self) {
    return (
      <span title="Vous ne pouvez pas modifier votre propre rôle" className="inline-flex">
        {badge}
      </span>
    );
  }

  async function choisir(role: Role) {
    setOpen(false);
    if (role === utilisateur.role) return;
    setBusy(true);
    await setUtilisateurRole(utilisateur.id, role);
    setBusy(false);
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-label={`Changer le rôle de ${utilisateur.nom} (actuel : ${ROLE_LABEL[utilisateur.role]})`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-interactive/10 px-2.5 py-1 text-xs font-medium text-brand-interactive transition-shadow hover:ring-2 hover:ring-brand-interactive/30 disabled:opacity-60"
      >
        {ROLE_LABEL[utilisateur.role]}
        <ChevronDown size={12} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1.5 w-56 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lg"
        >
          {ROLES.map((role) => {
            const courant = role === utilisateur.role;
            return (
              <button
                key={role}
                type="button"
                role="menuitem"
                onClick={() => choisir(role)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface"
              >
                <span className="flex-1">{ROLE_LABEL[role]}</span>
                {courant && <Check size={14} className="text-brand-interactive" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
