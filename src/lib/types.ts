// Modèle de données TREKKA (cf. cahier des charges §7.3)

export type Role =
  | "super-admin"
  | "moa" // Maître d'ouvrage
  | "moe" // Maître d'œuvre / Chef de projet
  | "chef-chantier" // Conducteur de travaux
  | "ouvrier"
  | "controle" // Bureau de contrôle
  | "bailleur"; // Décideur / Bailleur

// États projet/tâche — alignés sur les badges d'état de la charte (§5.1)
export type StatusKey = "ontime" | "risk" | "late" | "done" | "paused";

export type ProjectType =
  | "route"
  | "pont"
  | "barrage"
  | "batiment"
  | "hydraulique"
  | "scolaire"
  | "hospitalier";

export interface Utilisateur {
  id: string;
  nom: string;
  role: Role;
  email: string;
  actif: boolean;
}

// Référence légère vers un ouvrier affecté à une tâche (BF — affectation MOE).
export interface OuvrierRef {
  id: string;
  nom: string;
}

// Remarque déposée sur une tâche par le maître d'ouvrage ou le super-admin.
export interface Remarque {
  id: string;
  auteur: string;
  contenu: string;
  date: string; // ISO datetime
}

// Validation de clôture d'une tâche : l'ouvrier affecté déclare la tâche
// terminée (« en_attente ») ; le maître d'œuvre valide après vérification
// (tâche à 100 % / « done », retour à « none ») ou refuse (retour à « none »).
export type ValidationCloture = "none" | "en_attente";

export interface Tache {
  id: string;
  etapeId: string;
  activiteId: string;
  ordre: number;
  intitule: string;
  avancement: number; // % réalisé
  statut: StatusKey;
  responsable: string; // libellé d'équipe (legacy / complément aux ouvriers affectés)
  echeance: string; // ISO date
  ouvriers: OuvrierRef[]; // ouvriers affectés par le maître d'œuvre
  remarques: Remarque[]; // remarques du MOA / super-admin
  validation: ValidationCloture; // demande de clôture en attente de validation MOE
}

// Activité : regroupe des tâches. Se déverrouille lorsque l'activité précédente
// de l'étape est entièrement terminée (verrouillage séquentiel).
export interface Activite {
  id: string;
  etapeId: string;
  ordre: number;
  intitule: string;
  avancement: number; // % calculé = moyenne des tâches
  statut: StatusKey;
  verrouillee: boolean; // true tant que l'activité précédente n'est pas terminée
  taches: Tache[];
}

// Étape : regroupe des activités. Se déverrouille lorsque l'étape précédente est
// entièrement terminée (toutes ses activités achevées).
export interface Etape {
  id: string;
  ordre: number;
  intitule: string;
  avancement: number; // % calculé = moyenne des activités
  statut: StatusKey;
  verrouillee: boolean; // true tant que l'étape précédente n'est pas terminée
  activites: Activite[];
}

export interface Alerte {
  id: string;
  projetId: string;
  type: "retard" | "budget" | "incident";
  severite: "risk" | "late";
  message: string;
  date: string; // ISO datetime
}

export interface Projet {
  id: string;
  intitule: string;
  type: ProjectType;
  region: string;
  moa: string; // Maître d'ouvrage
  lot: string;
  statut: StatusKey;
  avancement: number; // % physique
  budgetTotal: number; // FCFA
  budgetConsomme: number; // FCFA
  delaiRestantJours: number;
  lat: number;
  lng: number;
  etapes: Etape[]; // découpage hiérarchique réalisé par le maître d'œuvre
  taches: Tache[]; // liste à plat de toutes les tâches (dérivée des étapes) — vues transverses
}

// Journal d'audit (BF-15 / BNF-09) : trace horodatée des actions.
export interface EntreeJournal {
  id: string;
  acteur: string;
  action: string;
  cible: string;
  date: string; // ISO datetime
}

// Gestion documentaire (BF-09).
export type DocumentType = "pv" | "os" | "plan" | "photo" | "rapport";

export interface Document {
  id: string;
  projetId: string;
  nom: string;
  type: DocumentType;
  taille: string; // libellé lisible, ex. « 1,2 Mo »
  date: string; // ISO date
  mime: string | null; // type MIME du fichier (null si métadonnées seules)
  hasFile: boolean; // true si un contenu réel est stocké (téléchargeable / aperçu)
}
