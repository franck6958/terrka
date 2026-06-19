"use client";

import { Minus, Plus } from "lucide-react";
import { useStore } from "@/lib/store";

// Saisie terrain de l'avancement d'une tâche (BF-05 / BF-07).
export function AvancementControl({
  projetId,
  tacheId,
  value,
}: {
  projetId: string;
  tacheId: string;
  value: number;
}) {
  const { updateTacheAvancement } = useStore();
  const step = (delta: number) => updateTacheAvancement(projetId, tacheId, value + delta);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Diminuer l'avancement"
        onClick={() => step(-5)}
        disabled={value <= 0}
        className="flex h-8 w-8 items-center justify-center rounded-control border border-line text-slate hover:bg-surface disabled:opacity-40"
      >
        <Minus size={15} />
      </button>

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        aria-label="Avancement de la tâche"
        onChange={(e) => updateTacheAvancement(projetId, tacheId, Number(e.target.value))}
        className="h-1.5 w-28 cursor-pointer accent-brand-interactive"
      />

      <button
        type="button"
        aria-label="Augmenter l'avancement"
        onClick={() => step(5)}
        disabled={value >= 100}
        className="flex h-8 w-8 items-center justify-center rounded-control border border-line text-slate hover:bg-surface disabled:opacity-40"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
