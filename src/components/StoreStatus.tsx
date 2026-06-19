"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";

// Bandeau global d'état du chargement des données (depuis la base Neon).
// - Fine barre de progression tant que les données ne sont pas chargées.
// - Bandeau d'erreur actionnable si /api/bootstrap échoue.
export function StoreStatus() {
  const { hydrated, error } = useStore();

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 border-b border-state-late/30 bg-state-late/10 px-5 py-2.5 text-sm text-state-late"
      >
        <AlertTriangle size={16} aria-hidden />
        <span className="font-medium">{error}</span>
        <span className="text-state-late/80">
          Vérifiez la base de données puis réessayez.
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-control border border-state-late/40 px-2.5 py-1 text-xs font-medium hover:bg-state-late/10"
        >
          <RefreshCw size={13} aria-hidden /> Réessayer
        </button>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="h-0.5 w-full overflow-hidden bg-brand-interactive/15" aria-hidden>
        <div className="h-full w-1/3 animate-pulse bg-brand-interactive" />
      </div>
    );
  }

  return null;
}
