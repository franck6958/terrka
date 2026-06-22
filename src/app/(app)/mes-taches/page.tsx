"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ListChecks,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Users,
  ChevronRight,
  ClipboardList,
  CircleCheck,
  Hourglass,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { ProgressBar } from "@/components/ProgressBar";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { STATUS } from "@/lib/status";
import { joursAvant } from "@/components/dashboards/shared";
import type { Projet, Tache } from "@/lib/types";

// Tâche enrichie de son contexte (projet + étape › activité) pour l'ouvrier.
interface TacheEnrichie {
  tache: Tache;
  projet: Projet;
  etape: string;
  activite: string;
}

// Construit la liste des tâches affectées à l'ouvrier connecté, tous projets
// confondus, avec le fil d'Ariane étape › activité reconstitué.
function mesTachesAffectees(projets: Projet[], userId: string): TacheEnrichie[] {
  const liste: TacheEnrichie[] = [];
  for (const projet of projets) {
    // Index des libellés d'étapes et d'activités pour reconstituer le contexte.
    const etapeLabel = new Map(projet.etapes.map((e) => [e.id, e.intitule]));
    const activiteLabel = new Map(
      projet.etapes.flatMap((e) => e.activites.map((a) => [a.id, a.intitule]))
    );
    for (const tache of projet.taches) {
      if (!tache.ouvriers.some((o) => o.id === userId)) continue;
      liste.push({
        tache,
        projet,
        etape: etapeLabel.get(tache.etapeId) ?? "—",
        activite: activiteLabel.get(tache.activiteId) ?? "—",
      });
    }
  }
  // Tri par urgence : tâches non terminées d'abord, échéance la plus proche en tête.
  return liste.sort((a, b) => {
    const aDone = a.tache.statut === "done" ? 1 : 0;
    const bDone = b.tache.statut === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return joursAvant(a.tache.echeance) - joursAvant(b.tache.echeance);
  });
}

export default function MesTachesPage() {
  const { projets, hydrated, error, demanderClotureTache } = useStore();
  const { user } = useAuth();

  const taches = useMemo(
    () => (user ? mesTachesAffectees(projets, user.id) : []),
    [projets, user]
  );

  const enCours = taches.filter((t) => t.tache.statut !== "done");
  const terminees = taches.length - enCours.length;
  const enRetard = enCours.filter((t) => joursAvant(t.tache.echeance) < 0).length;
  const prochesEcheances = enCours.filter((t) => joursAvant(t.tache.echeance) <= 7).length;

  return (
    <>
      <Topbar title="Mes tâches" />
      <main className="space-y-5 p-5 lg:p-6">
        <p className="text-sm text-slate">
          Les tâches qui vous ont été assignées par le maître d&apos;œuvre, classées par
          urgence. Suivez votre avancement, vos échéances et les remarques associées.
        </p>

        {error && (
          <div className="card border-state-late/30 bg-state-late/5 p-4 text-sm text-state-late">
            {error}
          </div>
        )}

        {!hydrated && !error ? (
          <div className="card flex items-center justify-center gap-2 p-10 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" aria-hidden /> Chargement de vos tâches…
          </div>
        ) : taches.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucune tâche assignée"
            description="Le maître d'œuvre ne vous a pas encore affecté de tâche. Cette page se remplira dès qu'une tâche vous sera confiée."
          />
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Tâches à réaliser" value={enCours.length} hint="En cours et à venir" icon={ListChecks} />
              <KpiCard label="Tâches terminées" value={terminees} hint="Bon travail !" icon={CheckCircle2} tone="ontime" />
              <KpiCard label="Échéances ≤ 7 j" value={prochesEcheances} hint="À traiter en priorité" icon={CalendarClock} tone="risk" />
              <KpiCard label="En retard" value={enRetard} hint="Échéance dépassée" icon={AlertTriangle} tone={enRetard ? "late" : "ontime"} />
            </section>

            <ul className="space-y-3">
              {taches.map(({ tache, projet, etape, activite }) => {
                const jours = joursAvant(tache.echeance);
                const s = STATUS[tache.statut];
                const Icon = s.icon;
                const enRetardTache = jours < 0 && tache.statut !== "done";
                const coequipiers = tache.ouvriers.filter((o) => o.id !== user?.id);
                return (
                  <li key={`${projet.id}-${tache.id}`} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={`shrink-0 ${s.text}`} aria-hidden />
                          <h3 className="truncate text-sm font-semibold text-ink">{tache.intitule}</h3>
                        </div>
                        {/* Fil d'Ariane : projet › étape › activité */}
                        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">
                          <Link href={`/projets/${projet.id}`} className="text-brand-interactive hover:underline">
                            {projet.intitule}
                          </Link>
                          <ChevronRight size={12} aria-hidden className="text-line" />
                          {etape}
                          <ChevronRight size={12} aria-hidden className="text-line" />
                          {activite}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          tache.statut === "done"
                            ? "bg-state-ontime/10 text-state-ontime"
                            : enRetardTache
                              ? "bg-state-late/10 text-state-late"
                              : jours <= 7
                                ? "bg-state-risk/10 text-state-risk"
                                : "bg-surface text-slate"
                        }`}
                      >
                        {tache.statut === "done"
                          ? "Terminée"
                          : enRetardTache
                            ? `${Math.abs(jours)} j de retard`
                            : `Échéance J-${jours}`}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <ProgressBar
                          value={tache.avancement}
                          tone={tache.statut === "late" ? "late" : tache.statut === "risk" ? "risk" : "ontime"}
                        />
                      </div>
                      <span className="kpi shrink-0 text-sm">{tache.avancement}%</span>
                    </div>

                    {/* Métadonnées : échéance, co-équipiers, remarques */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock size={13} aria-hidden />
                        {new Date(tache.echeance).toLocaleDateString("fr-FR")}
                      </span>
                      {coequipiers.length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={13} aria-hidden />
                          Avec {coequipiers.map((o) => o.nom).join(", ")}
                        </span>
                      )}
                      {tache.remarques.length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare size={13} aria-hidden />
                          {tache.remarques.length} remarque{tache.remarques.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Dernière remarque du MOA / super-admin, si présente */}
                    {tache.remarques.length > 0 && (
                      <div className="mt-3 rounded-control border border-line bg-surface p-3">
                        <p className="text-xs text-slate">
                          {tache.remarques[tache.remarques.length - 1].contenu}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          — {tache.remarques[tache.remarques.length - 1].auteur}
                        </p>
                      </div>
                    )}

                    {/* Déclaration de fin de tâche → validation du maître d'œuvre */}
                    <ClotureAction
                      projetId={projet.id}
                      tache={tache}
                      onDemander={demanderClotureTache}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </>
  );
}

// Action de clôture pour une tâche de l'ouvrier : bouton « Marquer comme
// terminée », ou état d'attente / validée selon l'avancement du workflow.
function ClotureAction({
  projetId,
  tache,
  onDemander,
}: {
  projetId: string;
  tache: Tache;
  onDemander: (projetId: string, tacheId: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);

  if (tache.statut === "done") {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm font-medium text-state-ontime">
        <CircleCheck size={16} aria-hidden /> Tâche terminée et validée
      </div>
    );
  }

  if (tache.validation === "en_attente") {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-sm font-medium text-state-risk">
        <Hourglass size={16} aria-hidden /> En attente de validation du maître d&apos;œuvre
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onDemander(projetId, tache.id);
          setBusy(false);
        }}
        className="btn btn-primary text-sm disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
        Marquer comme terminée
      </button>
      <p className="mt-1.5 text-xs text-muted">
        Votre déclaration sera soumise au maître d&apos;œuvre pour vérification.
      </p>
    </div>
  );
}
