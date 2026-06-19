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

export interface Tache {
  id: string;
  intitule: string;
  avancement: number; // % réalisé
  statut: StatusKey;
  responsable: string;
  echeance: string; // ISO date
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
  taches: Tache[];
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
