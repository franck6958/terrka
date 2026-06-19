"use client";

import { FileDown, BarChart3, CalendarRange } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { useStore } from "@/lib/store";
import { formatFCFA } from "@/lib/status";

export default function RapportsPage() {
  const { projets } = useStore();
  const exportDisabled = projets.length === 0;

  // jsPDF (~140 ko) est chargé à la demande, au clic, pour ne pas alourdir la page.
  async function exporter(periode?: string) {
    const { exportSynthesePDF } = await import("@/lib/pdf");
    exportSynthesePDF(projets, periode);
  }
  // Indicateurs consolidés par région (BF-12).
  const parRegion = projets.reduce<Record<string, { count: number; avAvg: number; budget: number }>>((acc, p) => {
    const r = (acc[p.region] ??= { count: 0, avAvg: 0, budget: 0 });
    r.count += 1;
    r.avAvg += p.avancement;
    r.budget += p.budgetTotal;
    return acc;
  }, {});

  return (
    <>
      <Topbar title="Rapports & indicateurs" />
      <main className="space-y-6 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate">Génération de rapports périodiques exportables en PDF (BF-13).</p>
          <button
            className="btn btn-primary disabled:opacity-50"
            type="button"
            disabled={exportDisabled}
            onClick={() => exporter()}
          >
            <FileDown size={16} /> Exporter en PDF
          </button>
        </div>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 text-ink">
            <BarChart3 size={18} className="text-brand-interactive" /> Synthèse par région
          </h2>
          <div className="divide-y divide-line/60">
            {Object.entries(parRegion).map(([region, r]) => {
              const moy = Math.round(r.avAvg / r.count);
              // Monochrome bleu : le statut est porté par la pastille (couleur d'état) + le %.
              const statut = moy < 40 ? "#D64550" : moy < 70 ? "#E8A317" : "#2E9E5B";
              return (
                <div key={region} className="py-3.5 first:pt-0.5 last:pb-0.5">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statut }} />
                      {region}
                    </span>
                    <span className="text-xs text-muted">
                      {r.count} projet{r.count > 1 ? "s" : ""} · {formatFCFA(r.budget)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/50">
                      <div
                        className="h-full rounded-full bg-brand-interactive/80 transition-[width] duration-700 ease-out"
                        style={{ width: `${moy}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-slate">{moy}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2">
            <CalendarRange size={18} className="text-brand-interactive" /> Rapports périodiques
          </h2>
          <ul className="divide-y divide-line text-sm">
            {["Rapport hebdomadaire — semaine 24", "Rapport mensuel — mai 2026", "Rapport trimestriel — T1 2026", "Bilan de transparence — bailleurs"].map((r) => (
              <li key={r} className="flex items-center justify-between py-3">
                <span className="text-ink">{r}</span>
                <button
                  type="button"
                  className="btn btn-secondary px-3 disabled:opacity-50"
                  disabled={exportDisabled}
                  onClick={() => exporter(r)}
                >
                  <FileDown size={15} /> PDF
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
