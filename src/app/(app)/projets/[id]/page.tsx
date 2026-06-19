"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  CalendarClock,
  CircleDollarSign,
  TrendingUp,
  FileText,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusBadgeMenu } from "@/components/StatusBadgeMenu";
import { ProgressBar } from "@/components/ProgressBar";
import { AvancementControl } from "@/components/AvancementControl";
import { useStore } from "@/lib/store";
import { formatFCFA, PROJECT_TYPE_LABEL } from "@/lib/status";

export default function ProjetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { projets, alertes, documents, hydrated } = useStore();
  const projet = projets.find((p) => p.id === id);

  // Les données sont chargées côté client depuis la base (via /api/bootstrap).
  // On n'affiche « introuvable » qu'une fois le store hydraté, sinon le rendu
  // initial (store vide) déclencherait un faux 404.
  if (!hydrated) {
    return (
      <>
        <Topbar title="Détail du projet" />
        <main className="p-5 lg:p-6">
          <div className="card flex items-center justify-center p-12 text-sm text-muted">
            Chargement du projet…
          </div>
        </main>
      </>
    );
  }
  if (!projet) notFound();

  const budgetPct = projet.budgetTotal ? Math.round((projet.budgetConsomme / projet.budgetTotal) * 100) : 0;
  const enRetard = projet.delaiRestantJours < 0;
  const alertesProjet = alertes.filter((a) => a.projetId === projet.id);
  const documentsProjet = documents.filter((d) => d.projetId === projet.id);

  return (
    <>
      <Topbar title="Détail du projet" />
      <main className="space-y-6 p-5 lg:p-6">
        <Link href="/projets" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-interactive hover:underline">
          <ArrowLeft size={16} /> Retour aux projets
        </Link>

        <section className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1>{projet.intitule}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <MapPin size={15} /> {projet.region}
                <span>·</span> MOA : {projet.moa}
                <span>·</span> {projet.lot}
                <span>·</span> {PROJECT_TYPE_LABEL[projet.type]}
              </p>
            </div>
            <StatusBadgeMenu projet={projet} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric icon={TrendingUp} label="Avancement physique" value={`${projet.avancement}%`} />
            <Metric
              icon={CalendarClock}
              label="Délai"
              value={enRetard ? `${Math.abs(projet.delaiRestantJours)} j de retard` : `${projet.delaiRestantJours} j restants`}
              tone={enRetard ? "late" : "ink"}
            />
            <Metric
              icon={CircleDollarSign}
              label="Budget consommé"
              value={`${budgetPct}%`}
              tone={budgetPct > projet.avancement + 5 ? "late" : "ink"}
            />
          </div>

          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-slate">Avancement global</span>
              <span className="kpi">{projet.avancement}%</span>
            </div>
            <ProgressBar
              value={projet.avancement}
              tone={projet.statut === "late" ? "late" : projet.statut === "risk" ? "risk" : "ontime"}
            />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-1 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-brand-interactive" /> Tâches & lots
            </h2>
            <p className="mb-4 text-xs text-muted">
              Mise à jour quotidienne de l&apos;avancement depuis le terrain (BF-05).
            </p>
            <div className="space-y-5">
              {projet.taches.map((t) => (
                <div key={t.id} className="border-b border-line pb-5 last:border-0 last:pb-0">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{t.intitule}</span>
                    <StatusBadge statut={t.statut} />
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={t.avancement}
                      tone={t.statut === "late" ? "late" : t.statut === "risk" ? "risk" : t.statut === "done" ? "interactive" : "ontime"}
                    />
                    <span className="kpi w-10 shrink-0 text-right text-sm">{t.avancement}%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {t.responsable} · échéance {new Date(t.echeance).toLocaleDateString("fr-FR")}
                    </p>
                    <AvancementControl projetId={projet.id} tacheId={t.id} value={t.avancement} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="card p-5">
              <h2 className="mb-3">Budget</h2>
              <p className="kpi text-2xl">{formatFCFA(projet.budgetConsomme)}</p>
              <p className="text-sm text-muted">sur {formatFCFA(projet.budgetTotal)}</p>
              <div className="mt-3">
                <ProgressBar value={budgetPct} tone={budgetPct > projet.avancement + 5 ? "late" : "interactive"} />
                <p className="mt-1.5 text-xs text-muted">{budgetPct}% engagé · avancement {projet.avancement}%</p>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-state-risk" /> Alertes ({alertesProjet.length})
              </h2>
              {alertesProjet.length === 0 ? (
                <p className="text-sm text-muted">Aucune alerte active.</p>
              ) : (
                <ul className="space-y-3">
                  {alertesProjet.map((a) => (
                    <li key={a.id} className="flex gap-2.5 text-sm">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.severite === "late" ? "bg-state-late" : "bg-state-risk"}`} />
                      <span className="text-ink">{a.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2">
                <FileText size={18} className="text-brand-interactive" /> Documents ({documentsProjet.length})
              </h2>
              {documentsProjet.length === 0 ? (
                <p className="text-sm text-muted">Aucun document rattaché.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {documentsProjet.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-slate">
                      <FileText size={14} className="text-muted" /> {d.nom}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "ink",
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  tone?: "ink" | "late";
}) {
  return (
    <div className="rounded-control bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon size={14} /> {label}
      </p>
      <p className={`kpi mt-1 text-xl ${tone === "late" ? "text-state-late" : "text-ink"}`}>{value}</p>
    </div>
  );
}
