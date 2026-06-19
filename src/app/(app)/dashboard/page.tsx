"use client";

import Link from "next/link";
import { FolderKanban, AlertTriangle, CircleDollarSign, TrendingUp, ArrowRight, Bell, CircleCheck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { ProjectCard } from "@/components/ProjectCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { useStore } from "@/lib/store";
import { STATUS } from "@/lib/status";
import type { StatusKey } from "@/lib/types";

export default function DashboardPage() {
  const { projets, alertes } = useStore();
  const getProjet = (id: string) => projets.find((p) => p.id === id);
  const total = projets.length;
  const enRetard = projets.filter((p) => p.statut === "late").length;
  const aRisque = projets.filter((p) => p.statut === "risk").length;
  // Gardes anti-division par zéro : le store démarre vide avant chargement de la base.
  const avancementMoyen = total ? Math.round(projets.reduce((s, p) => s + p.avancement, 0) / total) : 0;
  const budgetTotal = projets.reduce((s, p) => s + p.budgetTotal, 0);
  const budgetConsomme = projets.reduce((s, p) => s + p.budgetConsomme, 0);
  const budgetPct = budgetTotal ? Math.round((budgetConsomme / budgetTotal) * 100) : 0;

  // Répartition par état pour la synthèse portefeuille.
  const repartition = (Object.keys(STATUS) as StatusKey[]).map((k) => ({
    key: k,
    count: projets.filter((p) => p.statut === k).length,
  }));

  return (
    <>
      <Topbar title="Tableau de bord" />
      <main className="space-y-6 p-5 lg:p-6">
        <p className="text-sm text-slate">
          Vue consolidée du portefeuille de projets d&apos;infrastructures — avancement, délais et budget en temps réel.
        </p>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Projets suivis" value={total} hint={`${enRetard} en retard · ${aRisque} à risque`} icon={FolderKanban} />
          <KpiCard label="Avancement moyen" value={`${avancementMoyen}%`} hint="Portefeuille global" icon={TrendingUp} tone="ontime" />
          <KpiCard label="Alertes actives" value={alertes.length} hint="Retards, budget, incidents" icon={AlertTriangle} tone="risk" />
          <KpiCard label="Budget consommé" value={`${budgetPct}%`} hint="Tous projets confondus" icon={CircleDollarSign} tone={budgetPct > 70 ? "late" : "brand"} />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Projets prioritaires */}
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2>Projets à surveiller</h2>
              <Link href="/projets" className="inline-flex items-center gap-1 text-sm font-medium text-brand-interactive hover:underline">
                Tous les projets <ArrowRight size={15} />
              </Link>
            </div>
            {projets.some((p) => p.statut === "late" || p.statut === "risk") ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {projets
                  .filter((p) => p.statut === "late" || p.statut === "risk")
                  .map((p) => (
                    <ProjectCard key={p.id} projet={p} />
                  ))}
              </div>
            ) : (
              <div className="card flex flex-col items-center gap-2 p-8 text-center">
                <CircleCheck size={26} className="text-state-ontime" />
                <p className="text-sm font-medium text-ink">Aucun projet à risque ou en retard</p>
                <p className="text-sm text-muted">L&apos;ensemble du portefeuille est dans les délais.</p>
              </div>
            )}
          </section>

          {/* Colonne latérale : répartition + alertes */}
          <div className="space-y-6">
            <section className="card p-5">
              <h2 className="mb-4">Répartition par état</h2>
              <ul className="space-y-3">
                {repartition.map(({ key, count }) => {
                  const s = STATUS[key];
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <li key={key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                        <span className="kpi text-slate">{count}</span>
                      </div>
                      <ProgressBar
                        value={pct}
                        tone={key === "late" ? "late" : key === "risk" ? "risk" : key === "ontime" ? "ontime" : "interactive"}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2">
                  <Bell size={18} className="text-state-risk" /> Alertes récentes
                </h2>
                <Link href="/alertes" className="text-sm font-medium text-brand-interactive hover:underline">
                  Voir tout
                </Link>
              </div>
              <ul className="space-y-3">
                {alertes.slice(0, 4).map((a) => {
                  const projet = getProjet(a.projetId);
                  return (
                    <li key={a.id} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.severite === "late" ? "bg-state-late" : "bg-state-risk"}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-ink">{a.message}</p>
                        <p className="truncate text-xs text-muted">{projet?.intitule}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>

        {/* Synthèse avancement par projet */}
        <section className="card p-5">
          <h2 className="mb-4">Avancement par projet</h2>
          <div className="space-y-4">
            {projets.map((p) => (
              <Link key={p.id} href={`/projets/${p.id}`} className="flex items-center gap-4 hover:opacity-80">
                <span className="w-64 shrink-0 truncate text-sm text-ink">{p.intitule}</span>
                <ProgressBar
                  value={p.avancement}
                  tone={p.statut === "late" ? "late" : p.statut === "risk" ? "risk" : "ontime"}
                />
                <span className="kpi w-12 shrink-0 text-right text-sm">{p.avancement}%</span>
                <StatusBadge statut={p.statut} className="hidden shrink-0 md:inline-flex" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
