"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Upload,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { DocumentActions } from "@/components/DocumentActions";
import { useStore } from "@/lib/store";
import type { DocumentType } from "@/lib/types";

const ICON: Record<DocumentType, LucideIcon> = {
  pv: FileText,
  os: FileText,
  plan: FileSpreadsheet,
  photo: ImageIcon,
  rapport: FileText,
};

const LABEL: Record<DocumentType, string> = {
  pv: "Procès-verbal",
  os: "Ordre de service",
  plan: "Plan / étude",
  photo: "Photo de chantier",
  rapport: "Rapport",
};

const TYPES = Object.keys(LABEL) as DocumentType[];

// Taille maximale acceptée (alignée sur l'API : 5 Mo). Au-delà, le serveur
// refuserait l'enregistrement ; on filtre donc côté client pour un retour immédiat.
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Lit un fichier et renvoie son contenu encodé en base64 (sans le préfixe data:).
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage() {
  const { documents, projets, hydrated, addDocument } = useStore();
  const projetParId = useMemo(() => new Map(projets.map((p) => [p.id, p])), [projets]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // Recherche & filtres.
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<DocumentType | "">("");
  const [filtreProjet, setFiltreProjet] = useState("");

  const documentsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return documents.filter((d) => {
      if (filtreType && d.type !== filtreType) return false;
      if (filtreProjet && d.projetId !== filtreProjet) return false;
      if (q) {
        const projet = projetParId.get(d.projetId);
        const cible = `${d.nom} ${projet?.intitule ?? ""}`.toLowerCase();
        if (!cible.includes(q)) return false;
      }
      return true;
    });
  }, [documents, recherche, filtreType, filtreProjet, projetParId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.currentTarget.files?.[0];
    if (!file) {
      setFileName("");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Fichier trop volumineux (max 5 Mo).");
      e.currentTarget.value = "";
      setFileName("");
      return;
    }
    setFileName(file.name);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFileError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = (data.get("fichier") as File) ?? null;

    if (!file || file.size === 0) {
      setFileError("Veuillez sélectionner un fichier.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Fichier trop volumineux (max 5 Mo).");
      return;
    }

    setSaving(true);
    try {
      const contenu = await fileToBase64(file);
      const nomSaisi = String(data.get("nom") ?? "").trim();
      const ok = await addDocument({
        nom: nomSaisi || file.name,
        type: data.get("type") as DocumentType,
        projetId: String(data.get("projetId") ?? ""),
        taille: "", // recalculée côté serveur à partir du contenu
        contenu,
        mime: file.type || "application/octet-stream",
      });
      if (ok) {
        form.reset();
        setFileName("");
        setOpen(false);
      }
    } catch {
      setFileError("La lecture du fichier a échoué.");
    } finally {
      setSaving(false);
    }
  }

  const aucunDocument = hydrated && documents.length === 0;
  const aucunResultat = hydrated && documents.length > 0 && documentsFiltres.length === 0;

  return (
    <>
      <Topbar title="Documents" />
      <main className="space-y-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate">
            Gestion documentaire des projets (BF-09) — PV, ordres de service, plans et photos.
          </p>
          <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
            <Upload size={16} /> Téléverser
          </button>
        </div>

        {/* Recherche & filtres */}
        {!aucunDocument && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[14rem] flex-1">
              <span className="sr-only">Rechercher un document</span>
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher par nom ou projet…"
                className="input pl-9"
              />
            </label>

            <select
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value as DocumentType | "")}
              className="input w-auto"
              aria-label="Filtrer par type"
            >
              <option value="">Tous les types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{LABEL[t]}</option>
              ))}
            </select>

            <select
              value={filtreProjet}
              onChange={(e) => setFiltreProjet(e.target.value)}
              className="input w-auto"
              aria-label="Filtrer par projet"
            >
              <option value="">Tous les projets</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>{p.intitule}</option>
              ))}
            </select>
          </div>
        )}

        {aucunDocument ? (
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description="Aucun document n'est encore rattaché à un projet."
            action={
              <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
                <Upload size={16} /> Téléverser un document
              </button>
            }
          />
        ) : aucunResultat ? (
          <EmptyState
            icon={Search}
            title="Aucun résultat"
            description="Aucun document ne correspond à votre recherche ou à vos filtres."
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Projet</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium">Taille</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {documentsFiltres.map((d) => {
                  const Icon = ICON[d.type];
                  const projet = projetParId.get(d.projetId);
                  return (
                    <tr key={d.id} className="hover:bg-surface">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-ink">
                          <Icon size={16} className="text-brand-interactive" /> {d.nom}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate">{LABEL[d.type]}</td>
                      <td className="hidden max-w-[14rem] truncate px-4 py-3 text-slate md:table-cell">
                        {projet?.intitule ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-slate sm:table-cell">
                        {new Date(d.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-muted">{d.taille}</td>
                      <td className="px-4 py-3">
                        <DocumentActions doc={d} projets={projets} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Téléverser un document">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="fichier" className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Fichier</span>
            <input
              id="fichier"
              name="fichier"
              type="file"
              required
              onChange={handleFileChange}
              className="block w-full text-sm text-slate file:mr-3 file:rounded-control file:border-0 file:bg-brand-interactive file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:brightness-95"
            />
            {fileError && <span className="mt-1.5 block text-xs text-state-late">{fileError}</span>}
            <span className="mt-1.5 block text-xs text-muted">Taille maximale : 5 Mo.</span>
          </label>

          <label htmlFor="nom" className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">
              Nom affiché <span className="font-normal text-muted">(optionnel)</span>
            </span>
            <input
              id="nom"
              name="nom"
              type="text"
              placeholder={fileName || "Repris du nom du fichier"}
              className="input"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="type" className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate">Type</span>
              <select id="type" name="type" required defaultValue="" className="input">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LABEL[t]}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="projetId" className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate">Projet rattaché</span>
              <select id="projetId" name="projetId" required defaultValue="" className="input">
                <option value="" disabled>
                  Sélectionner…
                </option>
                {projets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.intitule}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
              {saving ? "Téléversement…" : "Téléverser"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
