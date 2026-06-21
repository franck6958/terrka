"use client";

import Link from "next/link";
import { Bell, ArrowRight, CircleCheck, type LucideIcon } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS, formatFCFA } from "@/lib/status";
import type { Projet, Alerte, StatusKey, Tache } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Briques partagées par les tableaux de bord propres à chaque rôle (BF-01).
// Chaque rôle compose ces widgets différemment selon ses besoins métier.
// ─────────────────────────────────────────────────────────────────────────────

/** Indicateurs consolidés du portefeuille, calculés une fois par dashboard. */
export interface PortfolioMetrics {
  total: number;
  enRetard: number;
  aRisque: number;
  termines: number;
  avancementMoyen: number;
  budgetTotal: number;
  budgetConsomme: number;
  budgetPct: number;
}

export function computeMetrics(projets: Projet[]): PortfolioMetrics {
  const total = projets.length;
  const budgetTotal = projets.reduce((s, p) => s + p.budgetTotal, 0);
  const budgetConsomme = projets.reduce((s, p) => s + p.budgetConsomme, 0);
  return {
    total,
    enRetard: projets.filter((p) => p.statut === "late").length,
    aRisque: projets.filter((p) => p.statut === "risk").length,
    termines: projets.filter((p) => p.statut === "done").length,
    // Gardes anti-division par zéro : le store démarre vide avant chargement de la base.
    avancementMoyen: total ? Math.round(projets.reduce((s, p) => s + p.avancement, 0) / total) : 0,
    budgetTotal,
    budgetConsomme,
    budgetPct: budgetTotal ? Math.round((budgetConsomme / budgetTotal) * 100) : 0,
  };
}

/** Tâche enrichie de son projet d'origine, pour les vues orientées terrain. */
export interface TacheAvecProjet {
  tache: Tache;
  projet: Projet;
}

export function flattenTaches(projets: Projet[]): TacheAvecProjet[] {
  return projets.flatMap((projet) => projet.taches.map((tache) => ({ tache, projet })));
}

/** Nombre de jours (entier, signé) entre aujourd'hui et une échéance ISO. */
export function joursAvant(echeance: string): number {
  const j = Math.ceil((new Date(echeance).getTime() - Date.now()) / 86_400_000);
  return Number.isFinite(j) ? j : 0;
}

// ── Bandeau de bienvenue, contextualisé par rôle ────────────────────────────

export function WelcomeBanner({
  nom,
  roleLabel,
  baseline,
}: {
  nom: string;
  roleLabel: string;
  baseline: string;
}) {
  const prenom = nom.split(" ")[0] || nom;
  return (
    <section className="card bg-brand p-5 text-white">
      <p className="text-xs uppercase tracking-wide text-white/70">{roleLabel}</p>
      <h2 className="mt-1 text-white">Bonjour {prenom}</h2>
      <p className="mt-1 text-sm text-white/80">{baseline}</p>
    </section>
  );
}

// ── Répartition par état ────────────────────────────────────────────────────

export function StatusRepartition({ projets }: { projets: Projet[] }) {
  const total = projets.length;
  const repartition = (Object.keys(STATUS) as StatusKey[]).map((k) => ({
    key: k,
    count: projets.filter((p) => p.statut === k).length,
  }));
  return (
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
  );
}

// ── Alertes récentes ────────────────────────────────────────────────────────

export function RecentAlertes({
  alertes,
  projets,
  limit = 4,
}: {
  alertes: Alerte[];
  projets: Projet[];
  limit?: number;
}) {
  const getProjet = (id: string) => projets.find((p) => p.id === id);
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2">
          <Bell size={18} className="text-state-risk" /> Alertes récentes
        </h2>
        <Link href="/alertes" className="text-sm font-medium text-brand-interactive hover:underline">
          Voir tout
        </Link>
      </div>
      {alertes.length === 0 ? (
        <p className="text-sm text-muted">Aucune alerte active.</p>
      ) : (
        <ul className="space-y-3">
          {alertes.slice(0, limit).map((a) => {
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
      )}
    </section>
  );
}

// ── Projets à surveiller (retard / risque) ──────────────────────────────────

export function ProjetsASurveiller({ projets, titre = "Projets à surveiller" }: { projets: Projet[]; titre?: string }) {
  const aSurveiller = projets.filter((p) => p.statut === "late" || p.statut === "risk");
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2>{titre}</h2>
        <Link href="/projets" className="inline-flex items-center gap-1 text-sm font-medium text-brand-interactive hover:underline">
          Tous les projets <ArrowRight size={15} />
        </Link>
      </div>
      {aSurveiller.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {aSurveiller.map((p) => (
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
  );
}

// ── Avancement par projet ───────────────────────────────────────────────────

export function AvancementParProjet({ projets }: { projets: Projet[] }) {
  return (
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
  );
}

// ── Budget par projet (vue financière) ──────────────────────────────────────

export function BudgetParProjet({ projets }: { projets: Projet[] }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4">Consommation budgétaire par projet</h2>
      <div className="space-y-4">
        {projets.map((p) => {
          const pct = p.budgetTotal ? Math.round((p.budgetConsomme / p.budgetTotal) * 100) : 0;
          const surconsomme = pct > p.avancement + 5;
          return (
            <Link key={p.id} href={`/projets/${p.id}`} className="block hover:opacity-80">
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-ink">{p.intitule}</span>
                <span className={`kpi shrink-0 ${surconsomme ? "text-state-late" : "text-slate"}`}>{pct}%</span>
              </div>
              <ProgressBar value={pct} tone={surconsomme ? "late" : "interactive"} />
              <p className="mt-1 text-xs text-muted">
                {formatFCFA(p.budgetConsomme)} / {formatFCFA(p.budgetTotal)}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Liste de tâches (vues terrain : chef de chantier, ouvrier, MOE) ─────────

export function TachesList({
  items,
  titre,
  vide = "Aucune tâche à afficher.",
  limit,
}: {
  items: TacheAvecProjet[];
  titre: string;
  vide?: string;
  limit?: number;
}) {
  const liste = limit ? items.slice(0, limit) : items;
  return (
    <section className="card p-5">
      <h2 className="mb-4">{titre}</h2>
      {liste.length === 0 ? (
        <p className="text-sm text-muted">{vide}</p>
      ) : (
        <ul className="divide-y divide-line">
          {liste.map(({ tache, projet }) => {
            const jours = joursAvant(tache.echeance);
            const s = STATUS[tache.statut];
            const Icon = s.icon;
            const enRetard = jours < 0 && tache.statut !== "done";
            return (
              <li key={tache.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={`/projets/${projet.id}`} className="flex items-center gap-4 hover:opacity-80">
                  <Icon size={16} className={`shrink-0 ${s.text}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{tache.intitule}</p>
                    <p className="truncate text-xs text-muted">{projet.intitule}</p>
                  </div>
                  <div className="hidden w-40 shrink-0 sm:block">
                    <ProgressBar
                      value={tache.avancement}
                      tone={tache.statut === "late" ? "late" : tache.statut === "risk" ? "risk" : "ontime"}
                    />
                  </div>
                  <span className="kpi w-10 shrink-0 text-right text-sm">{tache.avancement}%</span>
                  <span className={`w-28 shrink-0 text-right text-xs ${enRetard ? "font-medium text-state-late" : "text-muted"}`}>
                    {tache.statut === "done"
                      ? "Terminée"
                      : enRetard
                        ? `${Math.abs(jours)} j de retard`
                        : `J-${jours}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Carte de raccourci (accès rapide aux modules) ───────────────────────────

export function QuickLink({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
}) {
  return (
    <Link href={href} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-interactive/10 text-brand-interactive">
        <Icon size={22} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="truncate text-xs text-muted">{hint}</p>
      </div>
      <ArrowRight size={16} className="ml-auto shrink-0 text-muted" aria-hidden />
    </Link>
  );
}
