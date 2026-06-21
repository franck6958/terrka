import type { Projet, Etape, Activite, StatusKey } from "./types";

// Recalcul de la progression et du verrouillage côté client (miroir de la
// logique serveur dans queries.ts) — utilisé pour les mises à jour optimistes.
//
// Règles (cf. cahier des charges) :
//   activité.avancement = moyenne des tâches ; étape.avancement = moyenne des activités.
//   Une activité/étape est « terminée » lorsque tous ses enfants sont à 100 %.
//   Verrouillage séquentiel : on ne progresse sur une activité (resp. étape) que
//   si la précédente est terminée.

function statutAgrege(children: { statut: StatusKey }[], complete: boolean): StatusKey {
  if (complete) return "done";
  if (children.some((c) => c.statut === "late")) return "late";
  if (children.some((c) => c.statut === "risk")) return "risk";
  if (children.length > 0 && children.every((c) => c.statut === "paused")) return "paused";
  return "ontime";
}

function moyenne(values: number[]): number {
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
}

export function recomputeProjet(projet: Projet): Projet {
  const etapes: Etape[] = projet.etapes.map((e) => {
    const activites: Activite[] = e.activites.map((a) => {
      const complete = a.taches.length > 0 && a.taches.every((t) => t.avancement >= 100);
      return {
        ...a,
        avancement: moyenne(a.taches.map((t) => t.avancement)),
        statut: statutAgrege(a.taches, complete),
        verrouillee: false,
      };
    });
    const complete = activites.length > 0 && activites.every((a) => a.statut === "done");
    return {
      ...e,
      activites,
      avancement: moyenne(activites.map((a) => a.avancement)),
      statut: statutAgrege(activites, complete),
      verrouillee: false,
    };
  });

  let etapesPrecedentesDone = true;
  for (const e of etapes) {
    e.verrouillee = !etapesPrecedentesDone;
    let activitesPrecedentesDone = true;
    for (const a of e.activites) {
      a.verrouillee = e.verrouillee || !activitesPrecedentesDone;
      activitesPrecedentesDone = activitesPrecedentesDone && a.statut === "done";
    }
    etapesPrecedentesDone = etapesPrecedentesDone && e.statut === "done";
  }

  const taches = etapes.flatMap((e) => e.activites.flatMap((a) => a.taches));
  const avancement = taches.length
    ? Math.round(taches.reduce((s, t) => s + t.avancement, 0) / taches.length)
    : projet.avancement;

  let statut: StatusKey = projet.statut;
  if (statut !== "paused") {
    if (taches.length && taches.every((t) => t.avancement >= 100)) statut = "done";
    else if (projet.delaiRestantJours < 0) statut = "late";
  }

  return { ...projet, etapes, taches, avancement, statut };
}
