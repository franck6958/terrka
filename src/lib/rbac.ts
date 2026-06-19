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

// Rôles autorisés à gérer les projets (créer / modifier / supprimer / dupliquer).
// Les autres rôles disposent d'un accès en lecture seule.
const MANAGE_PROJET_ROLES: Role[] = ["super-admin", "moa", "moe"];

export function canManageProjets(role: string): boolean {
  return (MANAGE_PROJET_ROLES as string[]).includes(role);
}
