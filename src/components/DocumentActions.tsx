"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Download,
  Eye,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "./Modal";
import { useStore } from "@/lib/store";
import type { Document, DocumentType, Projet } from "@/lib/types";

const LABEL: Record<DocumentType, string> = {
  pv: "Procès-verbal",
  os: "Ordre de service",
  plan: "Plan / étude",
  photo: "Photo de chantier",
  rapport: "Rapport",
};

const TYPES = Object.keys(LABEL) as DocumentType[];

// Un document est prévisualisable dans le navigateur s'il s'agit d'une image
// ou d'un PDF (et qu'un contenu réel est bien stocké).
function isPreviewable(doc: Document): boolean {
  if (!doc.hasFile || !doc.mime) return false;
  return doc.mime.startsWith("image/") || doc.mime === "application/pdf";
}

// Menu d'actions d'un document : Télécharger, Aperçu, Modifier, Supprimer.
export function DocumentActions({ doc, projets }: { doc: Document; projets: Projet[] }) {
  const { updateDocument, deleteDocument } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermeture du menu au clic extérieur / Échap.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleDownload() {
    setMenuOpen(false);
    // L'endpoint renvoie le fichier en pièce jointe (Content-Disposition: attachment).
    window.location.href = `/api/documents/${doc.id}`;
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const ok = await updateDocument(doc.id, {
      nom: String(data.get("nom") ?? "").trim(),
      type: data.get("type") as DocumentType,
      projetId: String(data.get("projetId") ?? ""),
    });
    setBusy(false);
    if (ok) setEditOpen(false);
  }

  async function handleDelete() {
    setBusy(true);
    await deleteDocument(doc.id);
    setBusy(false);
    setConfirmOpen(false);
  }

  const previewable = isPreviewable(doc);

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={`Actions pour ${doc.nom}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-surface hover:text-ink"
      >
        <MoreVertical size={16} aria-hidden />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lg"
        >
          <MenuItem
            icon={Download}
            label="Télécharger"
            disabled={!doc.hasFile}
            onClick={handleDownload}
          />
          <MenuItem
            icon={Eye}
            label="Aperçu"
            disabled={!previewable}
            onClick={() => { setMenuOpen(false); setPreviewOpen(true); }}
          />
          <MenuItem
            icon={Pencil}
            label="Modifier"
            onClick={() => { setMenuOpen(false); setEditOpen(true); }}
          />
          <div className="my-1 border-t border-line" />
          <MenuItem
            icon={Trash2}
            label="Supprimer"
            danger
            onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
          />
        </div>
      )}

      {/* Aperçu */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={doc.nom}>
        {doc.mime?.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/documents/${doc.id}?inline=1`}
            alt={doc.nom}
            className="mx-auto max-h-[70vh] w-auto rounded-card border border-line"
          />
        ) : doc.mime === "application/pdf" ? (
          <iframe
            src={`/api/documents/${doc.id}?inline=1`}
            title={doc.nom}
            className="h-[70vh] w-full rounded-card border border-line"
          />
        ) : (
          <p className="text-sm text-muted">Aperçu indisponible pour ce type de fichier.</p>
        )}
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={handleDownload} className="btn btn-secondary">
            <Download size={16} /> Télécharger
          </button>
        </div>
      </Modal>

      {/* Modification des métadonnées */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le document">
        <form onSubmit={handleEdit} className="space-y-4">
          <label htmlFor={`edit-nom-${doc.id}`} className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Nom du fichier</span>
            <input
              id={`edit-nom-${doc.id}`}
              name="nom"
              type="text"
              required
              defaultValue={doc.nom}
              className="input"
            />
          </label>

          <label htmlFor={`edit-type-${doc.id}`} className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Type</span>
            <select id={`edit-type-${doc.id}`} name="type" required defaultValue={doc.type} className="input">
              {TYPES.map((t) => (
                <option key={t} value={t}>{LABEL[t]}</option>
              ))}
            </select>
          </label>

          <label htmlFor={`edit-projet-${doc.id}`} className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Projet rattaché</span>
            <select id={`edit-projet-${doc.id}`} name="projetId" required defaultValue={doc.projetId} className="input">
              {projets.map((p) => (
                <option key={p.id} value={p.id}>{p.intitule}</option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={() => setEditOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
              <Save size={16} /> {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation de suppression */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Supprimer le document">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-state-late/10 text-state-late">
            <AlertTriangle size={20} aria-hidden />
          </span>
          <div className="text-sm text-slate">
            <p>
              Voulez-vous vraiment supprimer <span className="font-medium text-ink">{doc.nom}</span> ?
            </p>
            <p className="mt-1 text-muted">Cette action est irréversible.</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setConfirmOpen(false)} className="btn btn-secondary">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="btn bg-state-late text-white hover:brightness-95 disabled:opacity-60"
          >
            <Trash2 size={16} /> {busy ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: typeof Download;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
        danger ? "text-state-late" : "text-ink"
      }`}
    >
      <Icon size={15} aria-hidden /> {label}
    </button>
  );
}
