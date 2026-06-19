import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Projet } from "@/lib/types";
import { formatFCFA, PROJECT_TYPE_LABEL } from "@/lib/status";
import { StatusBadgeMenu } from "./StatusBadgeMenu";
import { ProgressBar } from "./ProgressBar";
import { ProjectActions } from "./ProjectActions";

// Carte projet (charte §5.2) : intitulé, localisation, état, avancement, indicateurs clés.
// Le bloc entier ouvre la fiche (lien étendu) ; le menu d'actions reste cliquable au-dessus.
export function ProjectCard({ projet }: { projet: Projet }) {
  const budgetPct = Math.round((projet.budgetConsomme / projet.budgetTotal) * 100);
  const enRetard = projet.delaiRestantJours < 0;
  const budgetTone = budgetPct > projet.avancement + 5 ? "text-state-late" : "text-ink";

  return (
    <div className="card relative flex flex-col p-5 transition-shadow hover:shadow-md">
      {/* Lien étendu : couvre la carte pour la rendre cliquable, sous les contrôles. */}
      <Link
        href={`/projets/${projet.id}`}
        aria-label={`Ouvrir ${projet.intitule}`}
        className="absolute inset-0 z-0 rounded-card focus:outline-none focus:ring-2 focus:ring-brand-interactive/40"
      />

      {/* Contenu non interactif (les clics traversent vers le lien étendu). */}
      <div className="pointer-events-none relative z-10">
        <div className="flex items-start justify-between gap-2">
          <h3 className="leading-snug">{projet.intitule}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusBadgeMenu projet={projet} />
            <ProjectActions projet={projet} />
          </div>
        </div>

        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <MapPin size={13} aria-hidden />
          {projet.region} · {projet.moa} · {projet.lot} · {PROJECT_TYPE_LABEL[projet.type]}
        </p>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate">Avancement</span>
            <span className="kpi">{projet.avancement}%</span>
          </div>
          <ProgressBar value={projet.avancement} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-control bg-surface p-3">
            <p className="text-xs text-muted">Délai restant</p>
            <p className={`kpi text-lg ${enRetard ? "text-state-late" : "text-ink"}`}>
              {enRetard ? `+${Math.abs(projet.delaiRestantJours)} j de retard` : `${projet.delaiRestantJours} jours`}
            </p>
          </div>
          <div className="rounded-control bg-surface p-3">
            <p className="text-xs text-muted">Budget consommé</p>
            <p className={`kpi text-lg ${budgetTone}`}>{budgetPct}%</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          Budget : {formatFCFA(projet.budgetConsomme)} / {formatFCFA(projet.budgetTotal)}
        </p>
      </div>
    </div>
  );
}
