"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  AlertTriangle,
  CircleDollarSign,
  TrendingUp,
  ListChecks,
  CalendarClock,
  CheckCircle2,
  Users,
  History,
  FileText,
  BarChart3,
  ShieldCheck,
  HardHat,
  Hourglass,
  Check,
  X,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABEL, formatFCFA } from "@/lib/status";
import type { Role } from "@/lib/types";
import {
  computeMetrics,
  flattenTaches,
  joursAvant,
  WelcomeBanner,
  StatusRepartition,
  RecentAlertes,
  ProjetsASurveiller,
  AvancementParProjet,
  BudgetParProjet,
  TachesList,
  QuickLink,
} from "./shared";

// Bandeau de bienvenue commun, alimenté par le rôle courant.
function useBanner(baseline: string) {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABEL[user.role as Role] ?? user.role : "";
  return <WelcomeBanner nom={user?.nom ?? ""} roleLabel={roleLabel} baseline={baseline} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER-ADMIN — pilotage global : portefeuille + administration plateforme.
// ─────────────────────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const { projets, alertes, utilisateurs, documents } = useStore();
  const m = computeMetrics(projets);
  const comptesActifs = utilisateurs.filter((u) => u.actif).length;
  const banner = useBanner("Pilotage global de la plateforme — portefeuille, comptes et traçabilité.");

  return (
    <main className="space-y-6 p-5 lg:p-6">
      {banner}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Projets suivis" value={m.total} hint={`${m.enRetard} en retard · ${m.aRisque} à risque`} icon={FolderKanban} />
        <KpiCard label="Avancement moyen" value={`${m.avancementMoyen}%`} hint="Portefeuille global" icon={TrendingUp} tone="ontime" />
        <KpiCard label="Alertes actives" value={alertes.length} hint="Retards, budget, incidents" icon={AlertTriangle} tone="risk" />
        <KpiCard label="Comptes utilisateurs" value={utilisateurs.length} hint={`${comptesActifs} actifs`} icon={Users} tone="brand" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjetsASurveiller projets={projets} />
        </div>
        <div className="space-y-6">
          <StatusRepartition projets={projets} />
          <RecentAlertes alertes={alertes} projets={projets} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QuickLink href="/utilisateurs" icon={Users} label="Gestion des utilisateurs" hint={`${utilisateurs.length} comptes`} />
        <QuickLink href="/journal" icon={History} label="Journal d'audit" hint="Traçabilité des actions" />
        <QuickLink href="/documents" icon={FileText} label="Documents" hint={`${documents.length} fichiers`} />
      </section>

      <AvancementParProjet projets={projets} />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOA (maître d'ouvrage) — suivi stratégique de son portefeuille + budget.
// ─────────────────────────────────────────────────────────────────────────────
export function MoaDashboard() {
  const { projets, alertes } = useStore();
  const m = computeMetrics(projets);
  const banner = useBanner("Suivi de votre portefeuille — avancement, délais et engagement budgétaire.");

  return (
    <main className="space-y-6 p-5 lg:p-6">
      {banner}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Projets suivis" value={m.total} hint={`${m.enRetard} en retard · ${m.aRisque} à risque`} icon={FolderKanban} />
        <KpiCard label="Avancement moyen" value={`${m.avancementMoyen}%`} hint="Portefeuille global" icon={TrendingUp} tone="ontime" />
        <KpiCard label="Alertes actives" value={alertes.length} hint="Retards, budget, incidents" icon={AlertTriangle} tone="risk" />
        <KpiCard label="Budget consommé" value={`${m.budgetPct}%`} hint={formatFCFA(m.budgetConsomme)} icon={CircleDollarSign} tone={m.budgetPct > 70 ? "late" : "brand"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjetsASurveiller projets={projets} />
        </div>
        <div className="space-y-6">
          <StatusRepartition projets={projets} />
          <RecentAlertes alertes={alertes} projets={projets} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetParProjet projets={projets} />
        <AvancementParProjet projets={projets} />
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOE (maître d'œuvre / chef de projet) — pilotage opérationnel des tâches.
// ─────────────────────────────────────────────────────────────────────────────
export function MoeDashboard() {
  const { projets, alertes } = useStore();
  const m = computeMetrics(projets);
  const taches = flattenTaches(projets);
  const tachesEnCours = taches.filter((t) => t.tache.statut !== "done");
  const aValider = taches.filter((t) => t.tache.validation === "en_attente").length;
  // Tâches non terminées triées par urgence (échéance la plus proche en tête).
  const echeances = [...tachesEnCours].sort((a, b) => joursAvant(a.tache.echeance) - joursAvant(b.tache.echeance));
  const banner = useBanner("Pilotage opérationnel — avancement des tâches et échéances à tenir.");

  return (
    <main className="space-y-6 p-5 lg:p-6">
      {banner}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Projets pilotés" value={m.total} hint={`${m.enRetard} en retard · ${m.aRisque} à risque`} icon={FolderKanban} />
        <KpiCard label="Tâches en cours" value={tachesEnCours.length} hint={`${taches.length - tachesEnCours.length} terminées`} icon={ListChecks} tone="brand" />
        <KpiCard label="Tâches à valider" value={aValider} hint="Déclarées terminées par les ouvriers" icon={Hourglass} tone={aValider ? "risk" : "ontime"} />
        <KpiCard label="Alertes actives" value={alertes.length} hint="Retards, budget, incidents" icon={AlertTriangle} tone="risk" />
      </section>

      <TachesAValider />

      <ProjetsASurveiller projets={projets} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TachesList items={echeances} titre="Échéances à tenir" limit={8} vide="Aucune tâche en cours." />
        </div>
        <RecentAlertes alertes={alertes} projets={projets} />
      </div>

      <AvancementParProjet projets={projets} />
    </main>
  );
}

// ── Tâches en attente de validation de clôture (MOE / chef de chantier) ──────
// L'ouvrier déclare une tâche terminée ; le validateur vérifie puis valide, ou
// refuse en précisant un motif (transmis à l'ouvrier en remarque).
function TachesAValider() {
  const { projets, validerClotureTache } = useStore();
  const enAttente = flattenTaches(projets).filter((t) => t.tache.validation === "en_attente");
  const [busyId, setBusyId] = useState<string | null>(null);
  // Tâche dont le refus est en cours de saisie (motif), et texte du motif.
  const [refusId, setRefusId] = useState<string | null>(null);
  const [motif, setMotif] = useState("");

  const valider = async (projetId: string, tacheId: string) => {
    setBusyId(tacheId);
    await validerClotureTache(projetId, tacheId, true);
    setBusyId(null);
  };

  const confirmerRefus = async (projetId: string, tacheId: string) => {
    if (!motif.trim()) return;
    setBusyId(tacheId);
    const ok = await validerClotureTache(projetId, tacheId, false, motif);
    setBusyId(null);
    if (ok) {
      setRefusId(null);
      setMotif("");
    }
  };

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2">
        <Hourglass size={18} className="text-state-risk" /> Tâches à valider
      </h2>
      <p className="mb-4 text-xs text-muted">
        Tâches déclarées terminées par les ouvriers, en attente de votre vérification.
      </p>
      {enAttente.length === 0 ? (
        <p className="text-sm text-muted">Aucune tâche en attente de validation.</p>
      ) : (
        <ul className="divide-y divide-line">
          {enAttente.map(({ tache, projet }) => {
            const busy = busyId === tache.id;
            const enRefus = refusId === tache.id;
            return (
              <li key={`${projet.id}-${tache.id}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{tache.intitule}</p>
                    <Link href={`/projets/${projet.id}`} className="truncate text-xs text-brand-interactive hover:underline">
                      {projet.intitule}
                    </Link>
                    {tache.ouvriers.length > 0 && (
                      <p className="truncate text-xs text-muted">Déclarée par {tache.ouvriers.map((o) => o.nom).join(", ")}</p>
                    )}
                  </div>
                  {!enRefus && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => valider(projet.id, tache.id)}
                        className="btn btn-primary text-xs disabled:opacity-60"
                      >
                        <Check size={14} aria-hidden /> Valider
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => { setRefusId(tache.id); setMotif(""); }}
                        className="btn btn-secondary text-xs disabled:opacity-60"
                      >
                        <X size={14} aria-hidden /> Refuser
                      </button>
                    </div>
                  )}
                </div>

                {/* Saisie du motif de refus (transmis à l'ouvrier en remarque) */}
                {enRefus && (
                  <div className="mt-2 space-y-2 rounded-control bg-surface p-3">
                    <textarea
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="Motif du refus (ce qui reste à corriger)…"
                      className="input w-full text-sm"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setRefusId(null); setMotif(""); }}
                        className="btn btn-secondary text-xs"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={busy || !motif.trim()}
                        onClick={() => confirmerRefus(projet.id, tache.id)}
                        className="btn btn-primary text-xs disabled:opacity-60"
                      >
                        <X size={14} aria-hidden /> Confirmer le refus
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHEF DE CHANTIER (conducteur de travaux) — vue terrain centrée tâches.
// ─────────────────────────────────────────────────────────────────────────────
export function ChefChantierDashboard() {
  const { projets, alertes } = useStore();
  const { user } = useAuth();
  const toutes = flattenTaches(projets);
  // Tâches dont l'utilisateur est responsable ; repli sur l'ensemble si aucune.
  const mesTaches = toutes.filter((t) => t.tache.ouvriers.some((o) => o.id === user?.id));
  const taches = mesTaches.length ? mesTaches : toutes;
  const personnalise = mesTaches.length > 0;
  const enCours = taches.filter((t) => t.tache.statut !== "done");
  const prochesEcheances = enCours.filter((t) => joursAvant(t.tache.echeance) <= 7).length;
  const enRetard = enCours.filter((t) => joursAvant(t.tache.echeance) < 0).length;
  const incidents = alertes.filter((a) => a.type === "incident");
  const tri = [...enCours].sort((a, b) => joursAvant(a.tache.echeance) - joursAvant(b.tache.echeance));
  const banner = useBanner("Suivi de chantier — tâches du jour, échéances et incidents à remonter.");

  return (
    <main className="space-y-6 p-5 lg:p-6">
      {banner}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tâches en cours" value={enCours.length} hint={`${taches.length - enCours.length} terminées`} icon={ListChecks} />
        <KpiCard label="Échéances ≤ 7 j" value={prochesEcheances} hint="À traiter en priorité" icon={CalendarClock} tone="risk" />
        <KpiCard label="Tâches en retard" value={enRetard} hint="Échéance dépassée" icon={AlertTriangle} tone="late" />
        <KpiCard label="Incidents signalés" value={incidents.length} hint="Sur vos chantiers" icon={HardHat} tone={incidents.length ? "late" : "ontime"} />
      </section>

      <TachesAValider />

      <TachesList
        items={tri}
        titre={personnalise ? "Mes tâches" : "Tâches du chantier"}
        vide="Aucune tâche en cours."
      />

      <RecentAlertes alertes={incidents.length ? incidents : alertes} projets={projets} limit={5} />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OUVRIER — interface minimale, centrée sur ses tâches du jour (lecture).
// ─────────────────────────────────────────────────────────────────────────────
export function OuvrierDashboard() {
  const { projets } = useStore();
  const { user } = useAuth();
  // L'ouvrier ne voit QUE les tâches que le maître d'œuvre lui a affectées :
  // aucun repli sur l'ensemble du portefeuille (cloisonnement des données terrain).
  const taches = flattenTaches(projets).filter((t) => t.tache.ouvriers.some((o) => o.id === user?.id));
  const enCours = taches.filter((t) => t.tache.statut !== "done");
  const terminees = taches.length - enCours.length;
  const prochesEcheances = enCours.filter((t) => joursAvant(t.tache.echeance) <= 7).length;
  const tri = [...enCours].sort((a, b) => joursAvant(a.tache.echeance) - joursAvant(b.tache.echeance));
  const banner = useBanner("Vos tâches du jour — avancement et échéances à venir.");

  return (
    <main className="space-y-6 p-5 lg:p-6">
      {banner}

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Tâches à réaliser" value={enCours.length} hint="En cours et à venir" icon={ListChecks} />
        <KpiCard label="Tâches terminées" value={terminees} hint="Bon travail !" icon={CheckCircle2} tone="ontime" />
        <KpiCard label="Échéances ≤ 7 j" value={prochesEcheances} hint="À traiter en priorité" icon={CalendarClock} tone="risk" />
      </section>

      <TachesList
        items={tri}
        titre="Mes tâches"
        vide="Aucune tâche ne vous a encore été assignée par le maître d'œuvre."
      />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUREAU DE CONTRÔLE — qualité / conformité : inspections, incidents, documents.
// ─────────────────────────────────────────────────────────────────────────────
export function ControleDashboard() {
  const { projets, alertes, documents } = useStore();
  const aInspecter = projets.filter((p) => p.statut === "late" || p.statut === "risk").length;
  const incidents = alertes.filter((a) => a.type === "incident");
  // Documents de contrôle : procès-verbaux et ordres de service.
  const docsControle = documents.filter((d) => d.type === "pv" || d.type === "os");
  const banner = useBanner("Contrôle qualité — projets à inspecter, incidents et pièces de contrôle.");

  return (
    <main className="space-y-6 p-5 lg:p-6">
      {banner}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Projets à inspecter" value={aInspecter} hint="À risque ou en retard" icon={ShieldCheck} tone="risk" />
        <KpiCard label="Incidents" value={incidents.length} hint="À vérifier sur site" icon={AlertTriangle} tone={incidents.length ? "late" : "ontime"} />
        <KpiCard label="Alertes actives" value={alertes.length} hint="Retards, budget, incidents" icon={AlertTriangle} tone="risk" />
        <KpiCard label="PV & ordres de service" value={docsControle.length} hint="Pièces de contrôle" icon={FileText} tone="brand" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProjetsASurveiller projets={projets} titre="Projets à inspecter" />
        </div>
        <RecentAlertes alertes={incidents.length ? incidents : alertes} projets={projets} limit={6} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QuickLink href="/documents" icon={FileText} label="Pièces de contrôle" hint={`${docsControle.length} PV / OS`} />
        <QuickLink href="/journal" icon={History} label="Journal d'audit" hint="Traçabilité des actions" />
        <QuickLink href="/rapports" icon={BarChart3} label="Rapports" hint="Synthèses et exports" />
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BAILLEUR / DÉCIDEUR — vue stratégique, financière et en lecture seule.
// ─────────────────────────────────────────────────────────────────────────────
export function BailleurDashboard() {
  const { projets, alertes } = useStore();
  const m = computeMetrics(projets);
  const banner = useBanner("Vue stratégique — avancement global, engagement budgétaire et risques.");

  return (
    <main className="space-y-6 p-5 lg:p-6">
      {banner}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Avancement global" value={`${m.avancementMoyen}%`} hint="Portefeuille financé" icon={TrendingUp} tone="ontime" />
        <KpiCard label="Budget consommé" value={`${m.budgetPct}%`} hint={`${formatFCFA(m.budgetConsomme)} / ${formatFCFA(m.budgetTotal)}`} icon={CircleDollarSign} tone={m.budgetPct > 70 ? "late" : "brand"} />
        <KpiCard label="Projets financés" value={m.total} hint={`${m.termines} terminés`} icon={FolderKanban} />
        <KpiCard label="Projets à risque" value={m.aRisque + m.enRetard} hint={`${m.enRetard} en retard`} icon={AlertTriangle} tone="risk" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BudgetParProjet projets={projets} />
        </div>
        <div className="space-y-6">
          <StatusRepartition projets={projets} />
          <RecentAlertes alertes={alertes} projets={projets} />
        </div>
      </div>

      <AvancementParProjet projets={projets} />

      <section className="grid gap-4 sm:grid-cols-2">
        <QuickLink href="/rapports" icon={BarChart3} label="Rapports & exports" hint="Synthèses de suivi" />
        <QuickLink href="/carte" icon={FolderKanban} label="Cartographie des projets" hint="Répartition géographique" />
      </section>
    </main>
  );
}
