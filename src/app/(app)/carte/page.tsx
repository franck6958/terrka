"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Layers } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatusBadgeMenu } from "@/components/StatusBadgeMenu";
import { useStore } from "@/lib/store";
import { STATUS, PROJECT_TYPE_LABEL } from "@/lib/status";

// Leaflet manipule `window` : chargement client uniquement (pas de SSR).
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      Chargement de la carte…
    </div>
  ),
});

export default function CartePage() {
  const { projets } = useStore();
  const projetsCartographiables = useMemo(
    () => projets.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [projets]
  );

  return (
    <>
      <Topbar title="Cartographie" />
      <main className="space-y-5 p-5 lg:p-6">
        <p className="flex items-center gap-2 text-sm text-slate">
          <Layers size={15} /> Portefeuille géolocalisé — {projetsCartographiables.length} chantiers (OpenStreetMap).
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="card overflow-hidden lg:col-span-2">
            <div className="aspect-[4/3] w-full">
              <MapView projets={projetsCartographiables} />
            </div>
            <div className="flex flex-wrap gap-4 border-t border-line p-4 text-xs">
              {(["ontime", "risk", "late", "paused", "done"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS[k].dot}`} />
                  {STATUS[k].label}
                </span>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4">Chantiers</h2>
            <ul className="space-y-3">
              {projets.map((p) => (
                <li key={p.id} className="relative rounded-control hover:bg-surface">
                  <Link
                    href={`/projets/${p.id}`}
                    aria-label={`Ouvrir ${p.intitule}`}
                    className="absolute inset-0 z-0 rounded-control focus:outline-none focus:ring-2 focus:ring-brand-interactive/40"
                  />
                  <div className="pointer-events-none relative z-10 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        <MapPin size={14} className="text-muted" /> {p.region}
                      </span>
                      <StatusBadgeMenu projet={p} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {p.intitule} · {PROJECT_TYPE_LABEL[p.type]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
