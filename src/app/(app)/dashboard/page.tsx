"use client";

import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import {
  AdminDashboard,
  MoaDashboard,
  MoeDashboard,
  ChefChantierDashboard,
  OuvrierDashboard,
  ControleDashboard,
  BailleurDashboard,
} from "@/components/dashboards/role-dashboards";

// Titre de la barre supérieure adapté au rôle.
const TITRE_PAR_ROLE: Record<Role, string> = {
  "super-admin": "Tableau de bord — Administration",
  moa: "Tableau de bord — Maître d'ouvrage",
  moe: "Tableau de bord — Pilotage des travaux",
  "chef-chantier": "Tableau de bord — Chantier",
  ouvrier: "Mes tâches",
  controle: "Tableau de bord — Contrôle",
  bailleur: "Tableau de bord — Suivi stratégique",
};

// Interface de tableau de bord propre à chaque rôle (BF-01).
// L'accès à la route reste protégé en amont par le middleware + le layout (app).
function DashboardParRole({ role }: { role: Role }) {
  switch (role) {
    case "super-admin":
      return <AdminDashboard />;
    case "moa":
      return <MoaDashboard />;
    case "moe":
      return <MoeDashboard />;
    case "chef-chantier":
      return <ChefChantierDashboard />;
    case "ouvrier":
      return <OuvrierDashboard />;
    case "controle":
      return <ControleDashboard />;
    case "bailleur":
      return <BailleurDashboard />;
    default:
      // Repli défensif : portefeuille standard pour tout rôle non reconnu.
      return <MoaDashboard />;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { hydrated } = useStore();
  const role = (user?.role as Role) ?? "moa";

  return (
    <>
      <Topbar title={TITRE_PAR_ROLE[role] ?? "Tableau de bord"} />
      {/* On attend l'hydratation du store pour éviter d'afficher des indicateurs à zéro. */}
      {hydrated ? (
        <DashboardParRole role={role} />
      ) : (
        <main className="flex items-center justify-center p-16">
          <p className="text-sm text-muted">Chargement du tableau de bord…</p>
        </main>
      )}
    </>
  );
}
