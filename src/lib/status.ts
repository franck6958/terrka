import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleCheck,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import type { StatusKey, ProjectType, Role } from "./types";

// Badges d'état (charte §5.1) — couleur TOUJOURS doublée d'un libellé + icône (accessibilité §6)
export const STATUS: Record<
  StatusKey,
  { label: string; icon: LucideIcon; text: string; bg: string; dot: string }
> = {
  ontime: {
    label: "Dans les délais",
    icon: CheckCircle2,
    text: "text-state-ontime",
    bg: "bg-state-ontime/10",
    dot: "bg-state-ontime",
  },
  risk: {
    label: "À risque",
    icon: AlertTriangle,
    text: "text-state-risk",
    bg: "bg-state-risk/10",
    dot: "bg-state-risk",
  },
  late: {
    label: "En retard",
    icon: XCircle,
    text: "text-state-late",
    bg: "bg-state-late/10",
    dot: "bg-state-late",
  },
  done: {
    label: "Terminé",
    icon: CircleCheck,
    text: "text-brand-interactive",
    bg: "bg-brand-interactive/10",
    dot: "bg-brand-interactive",
  },
  paused: {
    label: "En pause",
    icon: PauseCircle,
    text: "text-slate",
    bg: "bg-muted/15",
    dot: "bg-muted",
  },
};

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  route: "Route",
  pont: "Pont",
  barrage: "Barrage",
  batiment: "Bâtiment",
  hydraulique: "Ouvrage hydraulique",
  scolaire: "Équipement scolaire",
  hospitalier: "Équipement hospitalier",
};

export const ROLE_LABEL: Record<Role, string> = {
  "super-admin": "Super-administrateur",
  moa: "Maître d'ouvrage",
  moe: "Maître d'œuvre",
  "chef-chantier": "Chef de chantier",
  ouvrier: "Ouvrier",
  controle: "Bureau de contrôle",
  bailleur: "Décideur / Bailleur",
};

const FCFA = new Intl.NumberFormat("fr-FR");
export const formatFCFA = (n: number) => `${FCFA.format(n)} FCFA`;
