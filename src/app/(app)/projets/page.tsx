"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Filter } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { STATUS } from "@/lib/status";
import type { StatusKey } from "@/lib/types";
import { cn } from "@/lib/cn";

const FILTERS: { key: StatusKey | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "ontime", label: STATUS.ontime.label },
  { key: "risk", label: STATUS.risk.label },
  { key: "late", label: STATUS.late.label },
  { key: "paused", label: STATUS.paused.label },
];

export default function ProjetsPage() {
  const { projets } = useStore();
  const [filtre, setFiltre] = useState<StatusKey | "all">("all");

  const liste = useMemo(
    () => (filtre === "all" ? projets : projets.filter((p) => p.statut === filtre)),
    [filtre, projets]
  );

  return (
    <>
      <Topbar title="Projets" />
      <main className="space-y-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate">
            <Filter size={15} /> {liste.length} projet{liste.length > 1 ? "s" : ""}
          </p>
          <Link href="/projets/nouveau" className="btn btn-primary">
            <Plus size={16} /> Créer un projet
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltre(f.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                filtre === f.key
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-slate hover:border-brand-interactive hover:text-brand-interactive"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {liste.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Aucun projet pour ce filtre"
            description="Aucun projet ne correspond à l'état sélectionné."
            action={
              <button type="button" onClick={() => setFiltre("all")} className="btn btn-secondary">
                Réinitialiser le filtre
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {liste.map((p) => (
              <ProjectCard key={p.id} projet={p} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
