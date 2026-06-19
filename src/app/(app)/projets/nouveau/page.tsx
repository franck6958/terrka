"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { useStore } from "@/lib/store";
import { PROJECT_TYPE_LABEL } from "@/lib/status";
import type { ProjectType } from "@/lib/types";

// Création d'un projet (BF-03) — branché sur le store TREKKA (addProjet).
// Régions administratives du Cameroun.
const REGIONS = [
  "Adamaoua",
  "Centre",
  "Est",
  "Extrême-Nord",
  "Littoral",
  "Nord",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Ouest",
] as const;

const TYPES = Object.keys(PROJECT_TYPE_LABEL) as ProjectType[];

export default function NouveauProjetPage() {
  const { addProjet } = useStore();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData(e.currentTarget);

    const id = await addProjet({
      intitule: String(data.get("intitule") ?? "").trim(),
      type: data.get("type") as ProjectType,
      region: String(data.get("region") ?? ""),
      moa: String(data.get("moa") ?? "").trim(),
      lot: String(data.get("lot") ?? "").trim(),
      budgetTotal: Number(data.get("budgetTotal") ?? 0),
      delaiRestantJours: Number(data.get("delaiRestantJours") ?? 0),
      lat: Number(data.get("lat") ?? 0),
      lng: Number(data.get("lng") ?? 0),
    });

    if (id) {
      router.push(`/projets/${id}`);
    } else {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Topbar title="Nouveau projet" />
      <main className="space-y-5 p-5 lg:p-6">
        <Link
          href="/projets"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-interactive hover:underline"
        >
          <ArrowLeft size={16} /> Retour aux projets
        </Link>

        <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5 p-6">
          <div>
            <h1 className="text-xl">Créer un projet</h1>
            <p className="mt-1 text-sm text-muted">
              Renseignez les informations principales du chantier. L&apos;avancement
              et le budget consommé démarrent à zéro.
            </p>
          </div>

          <Field label="Intitulé du projet" htmlFor="intitule">
            <input
              id="intitule"
              name="intitule"
              type="text"
              required
              placeholder="Ex. Réhabilitation de la route Douala — Yaoundé"
              className="input"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type d'ouvrage" htmlFor="type">
              <select id="type" name="type" required className="input" defaultValue="">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROJECT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Région" htmlFor="region">
              <select id="region" name="region" required className="input" defaultValue="">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Maître d'ouvrage (MOA)" htmlFor="moa">
              <input
                id="moa"
                name="moa"
                type="text"
                required
                placeholder="Ex. MINTP"
                className="input"
              />
            </Field>

            <Field label="Lot / marché" htmlFor="lot">
              <input
                id="lot"
                name="lot"
                type="text"
                required
                placeholder="Ex. Lot 1"
                className="input"
              />
            </Field>

            <Field label="Budget total (FCFA)" htmlFor="budgetTotal">
              <input
                id="budgetTotal"
                name="budgetTotal"
                type="number"
                min={0}
                step={1000}
                required
                placeholder="Ex. 1500000000"
                className="input"
              />
            </Field>

            <Field label="Délai restant (jours)" htmlFor="delaiRestantJours">
              <input
                id="delaiRestantJours"
                name="delaiRestantJours"
                type="number"
                step={1}
                required
                placeholder="Ex. 180"
                className="input"
              />
            </Field>

            <Field label="Latitude" htmlFor="lat">
              <input
                id="lat"
                name="lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                required
                placeholder="Ex. 4.0511"
                className="input"
              />
            </Field>

            <Field label="Longitude" htmlFor="lng">
              <input
                id="lng"
                name="lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                required
                placeholder="Ex. 9.7679"
                className="input"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-60">
              {submitting ? <Save size={16} /> : <Plus size={16} />}
              {submitting ? "Enregistrement…" : "Créer le projet"}
            </button>
            <Link href="/projets" className="btn btn-secondary">
              Annuler
            </Link>
          </div>
        </form>
      </main>
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate">{label}</span>
      {children}
    </label>
  );
}
