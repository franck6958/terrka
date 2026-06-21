import type { Role } from "./types";

// Contrôle d'accès par rôle (BF-02). Restreint l'accès à certains modules.
// Une route absente de cette table est accessible à tous les rôles authentifiés.
// Edge-safe : aucun import serveur, utilisable en middleware comme côté client.
const ROUTE_ROLES: Record<string, Role[]> = {
  "/utilisateurs": ["super-admin"],
  "/journal": ["super-admin", "moa", "controle", "bailleur"],
};

export function canAccess(role: string, pathname: string): boolean {
  const entry = Object.entries(ROUTE_ROLES).find(([prefix]) => pathname.startsWith(prefix));
  if (!entry) return true;
  return (entry[1] as string[]).includes(role);
}

// Création / modification / suppression / duplication d'un PROJET.
// Cahier des charges : seuls le maître d'ouvrage et le super-administrateur
// peuvent créer un projet ; ils en pilotent aussi le cycle de vie.
const MANAGE_PROJET_ROLES: Role[] = ["super-admin", "moa"];

export function canManageProjets(role: string): boolean {
  return (MANAGE_PROJET_ROLES as string[]).includes(role);
}

// Découpage du projet : étapes → activités → tâches, et affectation des tâches
// aux ouvriers. Cahier des charges : c'est le rôle du maître d'œuvre (le
// super-administrateur conserve un accès transversal).
const STRUCTURE_ROLES: Role[] = ["super-admin", "moe"];

export function canGererStructure(role: string): boolean {
  return (STRUCTURE_ROLES as string[]).includes(role);
}

// Dépôt de remarques sur une tâche. Cahier des charges : maître d'ouvrage et
// super-administrateur.
const REMARQUE_ROLES: Role[] = ["super-admin", "moa"];

export function canRemarquer(role: string): boolean {
  return (REMARQUE_ROLES as string[]).includes(role);
}

// Mise à jour de l'avancement d'une tâche depuis le terrain.
const AVANCEMENT_ROLES: Role[] = ["super-admin", "moe", "chef-chantier"];

export function canMajAvancement(role: string): boolean {
  return (AVANCEMENT_ROLES as string[]).includes(role);
}
