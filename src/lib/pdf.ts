import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Projet } from "./types";
import { STATUS, PROJECT_TYPE_LABEL } from "./status";

// Génération des rapports PDF TREKKA (BF-13).
// Exécuté côté client (jsPDF s'appuie sur l'environnement navigateur).

const BRAND: [number, number, number] = [27, 58, 107]; // #1B3A6B (charte)
const fmt = new Intl.NumberFormat("fr-FR");

// jsPDF (polices standard) ne gère pas les espaces insécables fines (U+202F).
const fcfa = (n: number) => `${fmt.format(n).replace(/[  ]/g, " ")} FCFA`;
const pct = (consomme: number, total: number) => (total ? Math.round((consomme / total) * 100) : 0);

/**
 * Exporte une synthèse consolidée du portefeuille : en-tête + KPI,
 * tableau par projet, puis tableau par région.
 */
export function exportSynthesePDF(projets: Projet[], periode?: string): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // — En-tête —
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text("TREKKA — Synthèse des projets d'infrastructures", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const dateStr = new Date().toLocaleDateString("fr-FR");
  doc.text(`${periode ? `${periode} · ` : ""}Généré le ${dateStr}`, 14, 25);

  // — KPI consolidés —
  const total = projets.length;
  const avancementMoyen = total ? Math.round(projets.reduce((s, p) => s + p.avancement, 0) / total) : 0;
  const budgetTotal = projets.reduce((s, p) => s + p.budgetTotal, 0);
  const budgetConsomme = projets.reduce((s, p) => s + p.budgetConsomme, 0);
  const enRetard = projets.filter((p) => p.statut === "late").length;

  doc.setTextColor(40);
  doc.text(
    `Projets suivis : ${total}    Avancement moyen : ${avancementMoyen}%    En retard : ${enRetard}    Budget : ${fcfa(budgetConsomme)} / ${fcfa(budgetTotal)} (${pct(budgetConsomme, budgetTotal)}%)`,
    14,
    32
  );

  // — Tableau par projet —
  autoTable(doc, {
    startY: 38,
    head: [["Projet", "Région", "Type", "Statut", "Avanc.", "Budget total", "Consommé", "%"]],
    body: projets.map((p) => [
      p.intitule,
      p.region,
      PROJECT_TYPE_LABEL[p.type],
      STATUS[p.statut].label,
      `${p.avancement}%`,
      fcfa(p.budgetTotal),
      fcfa(p.budgetConsomme),
      `${pct(p.budgetConsomme, p.budgetTotal)}%`,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND, fontSize: 8 },
    columnStyles: {
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  // — Tableau par région —
  const parRegion = new Map<string, { count: number; avSum: number; budget: number }>();
  for (const p of projets) {
    const r = parRegion.get(p.region) ?? { count: 0, avSum: 0, budget: 0 };
    r.count += 1;
    r.avSum += p.avancement;
    r.budget += p.budgetTotal;
    parRegion.set(p.region, r);
  }

  // @ts-expect-error — lastAutoTable est ajouté par le plugin autotable.
  const afterTable = (doc.lastAutoTable?.finalY ?? 38) + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND);
  doc.text("Synthèse par région", 14, afterTable);

  autoTable(doc, {
    startY: afterTable + 4,
    head: [["Région", "Projets", "Avancement moyen", "Budget total"]],
    body: [...parRegion.entries()].map(([region, r]) => [
      region,
      String(r.count),
      `${Math.round(r.avSum / r.count)}%`,
      fcfa(r.budget),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: BRAND },
    columnStyles: { 3: { halign: "right" } },
  });

  // — Pied de page —
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.text("TREKKA — Monitoring des projets d'infrastructures BTP · Cameroun", 14, h - 8);
    doc.text(`Page ${i} / ${pages}`, w - 14, h - 8, { align: "right" });
  }

  doc.save(`trekka-synthese-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exporte la fiche d'un projet : en-tête, caractéristiques, puis liste des tâches.
 */
export function exportProjetPDF(projet: Projet): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // — En-tête —
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text("TREKKA — Fiche projet", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.text(projet.intitule, 14, 36);

  const retard = projet.delaiRestantJours < 0;

  // — Caractéristiques —
  autoTable(doc, {
    startY: 42,
    head: [["Caractéristique", "Valeur"]],
    body: [
      ["Type d'ouvrage", PROJECT_TYPE_LABEL[projet.type]],
      ["Région", projet.region],
      ["Maître d'ouvrage", projet.moa],
      ["Lot / marché", projet.lot],
      ["Statut", STATUS[projet.statut].label],
      ["Avancement", `${projet.avancement}%`],
      ["Délai restant", retard ? `${Math.abs(projet.delaiRestantJours)} j de retard` : `${projet.delaiRestantJours} jours`],
      ["Budget total", fcfa(projet.budgetTotal)],
      ["Budget consommé", `${fcfa(projet.budgetConsomme)} (${pct(projet.budgetConsomme, projet.budgetTotal)}%)`],
      ["Coordonnées", `${projet.lat}, ${projet.lng}`],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: BRAND },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
  });

  // — Tâches —
  if (projet.taches.length) {
    // @ts-expect-error — lastAutoTable est ajouté par le plugin autotable.
    const y = (doc.lastAutoTable?.finalY ?? 42) + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND);
    doc.text("Tâches", 14, y);

    autoTable(doc, {
      startY: y + 4,
      head: [["Tâche", "Responsable", "Échéance", "Avanc.", "Statut"]],
      body: projet.taches.map((t) => [
        t.intitule,
        t.responsable,
        t.echeance,
        `${t.avancement}%`,
        STATUS[t.statut].label,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND, fontSize: 8 },
      columnStyles: { 3: { halign: "right" } },
    });
  }

  // — Pied de page —
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.text("TREKKA — Monitoring des projets d'infrastructures BTP · Cameroun", 14, h - 8);
    doc.text(`Page ${i} / ${pages}`, w - 14, h - 8, { align: "right" });
  }

  doc.save(`trekka-projet-${projet.id}.pdf`);
}
