import type { Projet, Alerte } from "./types";
import { alertes as incidentsManuels } from "./data";

// Seuils de déclenchement des alertes automatiques (BF-11).
export const SEUILS = {
  budgetRisk: 8, // écart (budget% − avancement%) déclenchant une vigilance
  budgetLate: 20, // écart déclenchant une alerte critique
  delaiProche: 21, // jours restants sous lesquels on surveille l'échéance
  avancementMini: 80, // % d'avancement attendu à l'approche de l'échéance
};

/**
 * Génère les alertes automatiques de retard et de dépassement budgétaire
 * à partir de l'état courant des projets, puis les fusionne avec les
 * incidents signalés manuellement (type "incident").
 */
export function computeAlertes(projets: Projet[]): Alerte[] {
  const auto: Alerte[] = [];
  const dateRef = "2026-06-17T00:00:00"; // date de génération (déterministe pour la démo)

  for (const p of projets) {
    // — Dépassement budgétaire —
    if (p.budgetTotal > 0) {
      const budgetPct = Math.round((p.budgetConsomme / p.budgetTotal) * 100);
      const ecart = budgetPct - p.avancement;
      if (ecart >= SEUILS.budgetLate) {
        auto.push({
          id: `${p.id}-budget`,
          projetId: p.id,
          type: "budget",
          severite: "late",
          message: `Dépassement budgétaire critique : ${budgetPct}% du budget consommé pour ${p.avancement}% d'avancement.`,
          date: dateRef,
        });
      } else if (ecart >= SEUILS.budgetRisk) {
        auto.push({
          id: `${p.id}-budget`,
          projetId: p.id,
          type: "budget",
          severite: "risk",
          message: `Budget consommé à ${budgetPct}% pour un avancement de ${p.avancement}% — vigilance.`,
          date: dateRef,
        });
      }
    }

    // — Retard / échéance —
    if (p.statut !== "done") {
      if (p.delaiRestantJours < 0) {
        auto.push({
          id: `${p.id}-delai`,
          projetId: p.id,
          type: "retard",
          severite: "late",
          message: `Échéance dépassée de ${Math.abs(p.delaiRestantJours)} jours.`,
          date: dateRef,
        });
      } else if (p.delaiRestantJours <= SEUILS.delaiProche && p.avancement < SEUILS.avancementMini) {
        auto.push({
          id: `${p.id}-delai`,
          projetId: p.id,
          type: "retard",
          severite: "risk",
          message: `Échéance dans ${p.delaiRestantJours} jours alors que l'avancement n'est que de ${p.avancement}%.`,
          date: dateRef,
        });
      }

      // — Tâches en retard —
      const tachesEnRetard = p.taches.filter((t) => t.statut === "late").length;
      if (tachesEnRetard > 0) {
        auto.push({
          id: `${p.id}-taches`,
          projetId: p.id,
          type: "retard",
          severite: "late",
          message: `${tachesEnRetard} tâche${tachesEnRetard > 1 ? "s" : ""} en retard sur le planning.`,
          date: dateRef,
        });
      }
    }
  }

  // Incidents signalés manuellement (conservés tels quels).
  const incidents = incidentsManuels.filter(
    (a) => a.type === "incident" && projets.some((p) => p.id === a.projetId)
  );

  // Tri : critiques d'abord, puis par date décroissante.
  return [...auto, ...incidents].sort((a, b) => {
    if (a.severite !== b.severite) return a.severite === "late" ? -1 : 1;
    return +new Date(b.date) - +new Date(a.date);
  });
}
