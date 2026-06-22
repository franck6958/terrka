import type {
  Projet,
  Alerte,
  Utilisateur,
  Document,
  EntreeJournal,
  Tache,
  Etape,
  Activite,
  OuvrierRef,
  StatusKey,
} from "./types";

// Ouvriers de démonstration affectés à certaines tâches : rattachement fiable
// utilisateur ↔ tâche (cohérent avec la table tache_ouvriers). Permet aux
// tableaux de bord « chef de chantier » et « ouvrier » d'afficher « mes tâches ».
const JEAN: OuvrierRef = { id: "u-4", nom: "Jean Eto'o" }; // chef-chantier
const ALI: OuvrierRef = { id: "u-7", nom: "Ali Bakari" }; // ouvrier

// Tâche « à plat » du jeu de démonstration (avant restructuration hiérarchique).
interface TacheSeed {
  id: string;
  intitule: string;
  avancement: number;
  statut: StatusKey;
  responsable: string;
  echeance: string;
  ouvriers?: OuvrierRef[];
}

// Enveloppe une liste de tâches dans une étape + activité uniques
// (« Étape 1 / Activité 1 »), à l'image de scripts/migrate-hierarchie.mjs.
// Renvoie la hiérarchie (etapes) et la liste à plat (taches) attendues par Projet.
function structurer(statut: StatusKey, seeds: TacheSeed[]): { etapes: Etape[]; taches: Tache[] } {
  const etapeId = "e-1";
  const activiteId = "a-1";
  const taches: Tache[] = seeds.map((s, i) => ({
    id: s.id,
    etapeId,
    activiteId,
    ordre: i + 1,
    intitule: s.intitule,
    avancement: s.avancement,
    statut: s.statut,
    responsable: s.responsable,
    echeance: s.echeance,
    ouvriers: s.ouvriers ?? [],
    remarques: [],
    validation: "none",
  }));
  const avancement = taches.length
    ? Math.round(taches.reduce((a, t) => a + t.avancement, 0) / taches.length)
    : 0;
  const activite: Activite = {
    id: activiteId,
    etapeId,
    ordre: 1,
    intitule: "Activité 1",
    avancement,
    statut,
    verrouillee: false,
    taches,
  };
  const etape: Etape = {
    id: etapeId,
    ordre: 1,
    intitule: "Étape 1",
    avancement,
    statut,
    verrouillee: false,
    activites: [activite],
  };
  return { etapes: [etape], taches };
}

// Métadonnées projet + tâches à plat. La hiérarchie est dérivée par structurer().
type ProjetSeed = Omit<Projet, "etapes" | "taches"> & { taches: TacheSeed[] };

const projetsSeed: ProjetSeed[] = [
  {
    id: "p-001",
    intitule: "Réhabilitation route Douala–Yaoundé",
    type: "route",
    region: "Littoral",
    moa: "MINTP",
    lot: "Lot 3",
    statut: "risk",
    avancement: 64,
    budgetTotal: 18_500_000_000,
    budgetConsomme: 14_430_000_000,
    delaiRestantJours: 18,
    lat: 4.0511,
    lng: 9.7679,
    taches: [
      { id: "t-1", intitule: "Terrassement section PK0–PK12", avancement: 100, statut: "done", responsable: "Eq. Terrassement", echeance: "2026-03-15" },
      { id: "t-2", intitule: "Couche de fondation", avancement: 80, statut: "risk", responsable: "Eq. Chaussée", echeance: "2026-06-30", ouvriers: [JEAN] },
      { id: "t-3", intitule: "Revêtement bitumineux", avancement: 35, statut: "risk", responsable: "Eq. Chaussée", echeance: "2026-08-20", ouvriers: [JEAN, ALI] },
      { id: "t-4", intitule: "Signalisation et glissières", avancement: 0, statut: "ontime", responsable: "Eq. Équipements", echeance: "2026-09-30", ouvriers: [ALI] },
    ],
  },
  {
    id: "p-002",
    intitule: "Construction pont sur le Wouri",
    type: "pont",
    region: "Littoral",
    moa: "MINTP",
    lot: "Lot unique",
    statut: "ontime",
    avancement: 42,
    budgetTotal: 9_200_000_000,
    budgetConsomme: 3_680_000_000,
    delaiRestantJours: 210,
    lat: 4.0617,
    lng: 9.6917,
    taches: [
      { id: "t-1", intitule: "Fondations profondes (pieux)", avancement: 90, statut: "done", responsable: "Eq. Génie civil", echeance: "2026-04-10" },
      { id: "t-2", intitule: "Piles et culées", avancement: 50, statut: "ontime", responsable: "Eq. Génie civil", echeance: "2026-07-15" },
      { id: "t-3", intitule: "Tablier", avancement: 10, statut: "ontime", responsable: "Eq. Charpente", echeance: "2026-11-30" },
    ],
  },
  {
    id: "p-003",
    intitule: "Barrage hydroélectrique de Bini",
    type: "barrage",
    region: "Adamaoua",
    moa: "MINEE",
    lot: "Lot 1 — Génie civil",
    statut: "late",
    avancement: 28,
    budgetTotal: 47_000_000_000,
    budgetConsomme: 21_150_000_000,
    delaiRestantJours: -12,
    lat: 7.3256,
    lng: 13.5847,
    taches: [
      { id: "t-1", intitule: "Dérivation provisoire", avancement: 100, statut: "done", responsable: "Eq. Hydraulique", echeance: "2026-02-01" },
      { id: "t-2", intitule: "Excavation fondation barrage", avancement: 45, statut: "late", responsable: "Eq. Terrassement", echeance: "2026-05-01", ouvriers: [JEAN] },
      { id: "t-3", intitule: "Bétonnage corps du barrage", avancement: 5, statut: "late", responsable: "Eq. Génie civil", echeance: "2026-10-01" },
    ],
  },
  {
    id: "p-004",
    intitule: "Lycée technique de Bafoussam",
    type: "scolaire",
    region: "Ouest",
    moa: "MINHDU",
    lot: "Lot 2 — Bâtiment",
    statut: "ontime",
    avancement: 76,
    budgetTotal: 2_400_000_000,
    budgetConsomme: 1_700_000_000,
    delaiRestantJours: 54,
    lat: 5.4769,
    lng: 10.4176,
    taches: [
      { id: "t-1", intitule: "Gros œuvre", avancement: 100, statut: "done", responsable: "Eq. Bâtiment", echeance: "2026-03-01" },
      { id: "t-2", intitule: "Second œuvre", avancement: 70, statut: "ontime", responsable: "Eq. Finitions", echeance: "2026-07-01" },
      { id: "t-3", intitule: "VRD et aménagements", avancement: 40, statut: "ontime", responsable: "Eq. VRD", echeance: "2026-08-10", ouvriers: [ALI] },
    ],
  },
  {
    id: "p-005",
    intitule: "Adduction d'eau potable de Garoua",
    type: "hydraulique",
    region: "Nord",
    moa: "MINEE",
    lot: "Lot 1",
    statut: "paused",
    avancement: 33,
    budgetTotal: 6_800_000_000,
    budgetConsomme: 2_240_000_000,
    delaiRestantJours: 95,
    lat: 9.3265,
    lng: 13.3958,
    taches: [
      { id: "t-1", intitule: "Station de pompage", avancement: 60, statut: "paused", responsable: "Eq. Hydraulique", echeance: "2026-06-15" },
      { id: "t-2", intitule: "Réseau de distribution", avancement: 20, statut: "paused", responsable: "Eq. Réseaux", echeance: "2026-09-15" },
    ],
  },
  {
    id: "p-006",
    intitule: "Centre hospitalier régional de Bertoua",
    type: "hospitalier",
    region: "Est",
    moa: "MINSANTE",
    lot: "Lot 3 — Équipements",
    statut: "risk",
    avancement: 58,
    budgetTotal: 12_100_000_000,
    budgetConsomme: 9_075_000_000,
    delaiRestantJours: 30,
    lat: 4.5774,
    lng: 13.6846,
    taches: [
      { id: "t-1", intitule: "Bloc opératoire — gros œuvre", avancement: 95, statut: "done", responsable: "Eq. Bâtiment", echeance: "2026-04-20" },
      { id: "t-2", intitule: "Fluides médicaux", avancement: 45, statut: "risk", responsable: "Eq. Technique", echeance: "2026-07-10", ouvriers: [JEAN] },
      { id: "t-3", intitule: "Équipement et mobilier", avancement: 20, statut: "risk", responsable: "Eq. Équipements", echeance: "2026-08-05" },
    ],
  },
];

export const projets: Projet[] = projetsSeed.map(({ taches, ...rest }) => {
  const { etapes, taches: flat } = structurer(rest.statut, taches);
  return { ...rest, etapes, taches: flat };
});

export const alertes: Alerte[] = [
  { id: "a-1", projetId: "p-003", type: "retard", severite: "late", message: "Échéance « Excavation fondation barrage » dépassée de 12 jours.", date: "2026-06-16T08:12:00" },
  { id: "a-2", projetId: "p-001", type: "budget", severite: "risk", message: "Budget consommé à 78 % pour un avancement de 64 %.", date: "2026-06-16T10:40:00" },
  { id: "a-3", projetId: "p-006", type: "budget", severite: "risk", message: "Budget consommé à 75 % — vigilance sur le lot Équipements.", date: "2026-06-15T16:05:00" },
  { id: "a-4", projetId: "p-003", type: "incident", severite: "late", message: "Incident chantier signalé : panne d'engin de terrassement.", date: "2026-06-14T13:22:00" },
  { id: "a-5", projetId: "p-001", type: "retard", severite: "risk", message: "Tâche « Revêtement bitumineux » en retard léger sur le planning.", date: "2026-06-13T09:00:00" },
];

export const utilisateurs: Utilisateur[] = [
  { id: "u-1", nom: "Breanna Nguekeng", role: "super-admin", email: "admin@trekka.cm", actif: true },
  { id: "u-2", nom: "Direction MINTP", role: "moa", email: "moa@mintp.cm", actif: true },
  { id: "u-3", nom: "Ing. Paul Mbarga", role: "moe", email: "p.mbarga@trekka.cm", actif: true },
  { id: "u-4", nom: "Jean Eto'o", role: "chef-chantier", email: "j.etoo@trekka.cm", actif: true },
  { id: "u-5", nom: "Bureau Veritas CM", role: "controle", email: "controle@trekka.cm", actif: true },
  { id: "u-6", nom: "Banque Mondiale", role: "bailleur", email: "suivi@bailleur.org", actif: true },
  { id: "u-7", nom: "Ali Bakari", role: "ouvrier", email: "a.bakari@trekka.cm", actif: true },
];

// Documents de démonstration : métadonnées seules (aucun contenu réel stocké
// → mime: null, hasFile: false). Les téléversements réels portent un vrai fichier.
export const documents: Document[] = [
  { id: "d-1", nom: "Ordre de service n°1 — Lot 3.pdf", type: "os", projetId: "p-001", date: "2026-01-12", taille: "1,2 Mo", mime: null, hasFile: false },
  { id: "d-2", nom: "PV de visite — mai 2026.pdf", type: "pv", projetId: "p-001", date: "2026-05-28", taille: "640 Ko", mime: null, hasFile: false },
  { id: "d-3", nom: "Plan d'exécution tablier.dwg", type: "plan", projetId: "p-002", date: "2026-04-03", taille: "8,5 Mo", mime: null, hasFile: false },
  { id: "d-4", nom: "Photo coulage béton.jpg", type: "photo", projetId: "p-003", date: "2026-06-10", taille: "3,1 Mo", mime: null, hasFile: false },
  { id: "d-5", nom: "Rapport mensuel — Bafoussam.pdf", type: "rapport", projetId: "p-004", date: "2026-06-01", taille: "920 Ko", mime: null, hasFile: false },
  { id: "d-6", nom: "PV de réception partielle.pdf", type: "pv", projetId: "p-006", date: "2026-05-20", taille: "510 Ko", mime: null, hasFile: false },
];

// Journal d'audit — entrées de démonstration (BF-15). Les actions réalisées
// dans l'application y sont ensuite ajoutées automatiquement (cf. logEvent).
export const journal: EntreeJournal[] = [
  { id: "j-1", acteur: "Ing. Paul Mbarga", action: "a validé le rapport", cible: "Réhabilitation route Douala–Yaoundé", date: "2026-06-16T11:42:00" },
  { id: "j-2", acteur: "Jean Eto'o", action: "a mis à jour l'avancement de la tâche", cible: "Couche de fondation → 80%", date: "2026-06-16T09:15:00" },
  { id: "j-3", acteur: "Système", action: "a généré une alerte de retard", cible: "Barrage hydroélectrique de Bini", date: "2026-06-16T08:12:00" },
  { id: "j-4", acteur: "Bureau Veritas CM", action: "a consigné une observation de visite", cible: "Centre hospitalier de Bertoua", date: "2026-06-15T16:30:00" },
  { id: "j-5", acteur: "Direction MINTP", action: "a mis le projet en pause", cible: "Adduction d'eau potable de Garoua", date: "2026-06-14T14:05:00" },
  { id: "j-6", acteur: "Breanna Nguekeng", action: "a créé le compte utilisateur", cible: "Ali Bakari (Ouvrier)", date: "2026-06-13T10:00:00" },
];

export const getProjet = (id: string) => projets.find((p) => p.id === id);
