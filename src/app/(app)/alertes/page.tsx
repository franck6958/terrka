"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  CircleDollarSign,
  TriangleAlert,
  CircleCheck,
  Check,
  CheckCheck,
  Bell,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";

const TYPE: Record<string, { label: string; icon: LucideIcon }> = {
  retard: { label: "Retard", icon: Clock },
  budget: { label: "Dépassement budgétaire", icon: CircleDollarSign },
  incident: { label: "Incident", icon: TriangleAlert },
};

type Filtre = "toutes" | "non-lues" | "critiques";

export default function AlertesPage() {
  const {
    alertes,
    alertesNonLues,
    projets,
    hydrated,
    error,
    marquerAlerteLue,
    marquerToutesAlertesLues,
  } = useStore();
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const getProjet = (id: string) => projets.find((p) => p.id === id);

  // Identifiants des alertes non lues — pour distinguer lu / non-lu à l'affichage.
  const nonLuesIds = useMemo(
    () => new Set(alertesNonLues.map((a) => a.id)),
    [alertesNonLues]
  );

  const compteurs = useMemo(
    () => ({
      toutes: alertes.length,
      "non-lues": alertesNonLues.length,
      critiques: alertes.filter((a) => a.severite === "late").length,
    }),
    [alertes, alertesNonLues]
  );

  // Liste filtrée selon l'onglet actif (déjà triée par le moteur d'alertes).
  const liste = useMemo(() => {
    if (filtre === "non-lues") return alertes.filter((a) => nonLuesIds.has(a.id));
    if (filtre === "critiques") return alertes.filter((a) => a.severite === "late");
    return alertes;
  }, [alertes, filtre, nonLuesIds]);

  const filtres: { key: Filtre; label: string }[] = [
    { key: "toutes", label: "Toutes" },
    { key: "non-lues", label: "Non lues" },
    { key: "critiques", label: "Critiques" },
  ];

  return (
    <>
      <Topbar title="Alertes & notifications" />
      <main className="space-y-5 p-5 lg:p-6">
        <p className="text-sm text-slate">
          Alertes automatiques de retard, de dépassement budgétaire ou d&apos;incident (BF-11),
          recalculées en temps réel selon l&apos;avancement et le budget des projets.
        </p>

        {/* Erreur de chargement de la base */}
        {error && (
          <div className="card border-state-late/30 bg-state-late/5 p-4 text-sm text-state-late">
            {error}
          </div>
        )}

        {/* Chargement initial (avant hydratation depuis la base) */}
        {!hydrated && !error ? (
          <div className="card flex items-center justify-center gap-2 p-10 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" aria-hidden /> Chargement des alertes…
          </div>
        ) : alertes.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Aucune alerte active"
            description="Tous les projets sont dans les délais et le budget."
          />
        ) : (
          <>
            {/* Barre de filtres + action « tout lire » */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les alertes">
                {filtres.map((f) => {
                  const actif = filtre === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={actif}
                      onClick={() => setFiltre(f.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-sm font-medium transition",
                        actif
                          ? "border-brand-interactive bg-brand-interactive/10 text-brand-interactive"
                          : "border-line text-slate hover:bg-surface"
                      )}
                    >
                      {f.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                          actif ? "bg-brand-interactive/15 text-brand-interactive" : "bg-surface text-muted"
                        )}
                      >
                        {compteurs[f.key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={marquerToutesAlertesLues}
                disabled={alertesNonLues.length === 0}
                className="btn btn-secondary disabled:opacity-50"
              >
                <CheckCheck size={16} aria-hidden /> Tout marquer comme lu
              </button>
            </div>

            {liste.length === 0 ? (
              <EmptyState
                icon={Bell}
                title={
                  filtre === "non-lues"
                    ? "Aucune alerte non lue"
                    : "Aucune alerte critique"
                }
                description={
                  filtre === "non-lues"
                    ? "Toutes les alertes ont été consultées."
                    : "Aucun projet n'est actuellement en situation critique."
                }
              />
            ) : (
              <div className="card divide-y divide-line">
                {liste.map((a) => {
                  const t = TYPE[a.type];
                  const Icon = t.icon;
                  const projet = getProjet(a.projetId);
                  const isLate = a.severite === "late";
                  const nonLue = nonLuesIds.has(a.id);
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "flex items-start gap-4 p-4",
                        nonLue && "bg-brand-interactive/[0.03]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-control",
                          isLate ? "bg-state-late/10 text-state-late" : "bg-state-risk/10 text-state-risk"
                        )}
                      >
                        <Icon size={18} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink">{t.label}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              isLate ? "bg-state-late/10 text-state-late" : "bg-state-risk/10 text-state-risk"
                            )}
                          >
                            {isLate ? "Critique" : "À risque"}
                          </span>
                          {nonLue && (
                            <span className="flex items-center gap-1 text-xs font-medium text-brand-interactive">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-interactive" aria-hidden />
                              Non lue
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate">{a.message}</p>
                        <p className="mt-1 text-xs text-muted">
                          {projet && (
                            <Link
                              href={`/projets/${projet.id}`}
                              className="text-brand-interactive hover:underline"
                            >
                              {projet.intitule}
                            </Link>
                          )}{" "}
                          · {new Date(a.date).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      {nonLue && (
                        <button
                          type="button"
                          onClick={() => marquerAlerteLue(a.id)}
                          title="Marquer comme lue"
                          aria-label="Marquer cette alerte comme lue"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line text-muted hover:bg-surface hover:text-state-ontime"
                        >
                          <Check size={16} aria-hidden />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
