import {
  LayoutDashboard,
  FolderKanban,
  Map,
  Bell,
  FileText,
  BarChart3,
  Users,
  History,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Navigation alignée sur les modules fonctionnels (cahier des charges §6.2).
// Source unique partagée par la Sidebar (desktop) et le MobileNav (mobile).
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projets", label: "Projets", icon: FolderKanban },
  { href: "/carte", label: "Cartographie", icon: Map },
  { href: "/alertes", label: "Alertes", icon: Bell },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/rapports", label: "Rapports", icon: BarChart3 },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/journal", label: "Journal d'audit", icon: History },
];

// État actif : exact pour la racine, par préfixe pour les sections.
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
