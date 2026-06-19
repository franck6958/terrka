"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Pencil,
  Copy,
  FileDown,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "./Modal";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { canManageProjets } from "@/lib/rbac";
import { PROJECT_TYPE_LABEL } from "@/lib/status";
import { exportProjetPDF } from "@/lib/pdf";
import type { Projet, ProjectType } from "@/lib/types";

// Régions administratives du Cameroun (alignées sur le formulaire de création).
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

// Menu d'actions d'une carte projet : Modifier, Dupliquer, Exporter en PDF, Supprimer.
// N'affiche rien si le rôle de l'utilisateur n'a pas le droit de gérer les projets.
export function ProjectActions({ projet }: { projet: Projet }) {
  const router = useRouter();
  const { user } = useAuth();
  const { updateProjet, deleteProjet, duplicateProjet } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  if (!user || !canManageProjets(user.role)) return null;

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const ok = await updateProjet(projet.id, {
      intitule: String(data.get("intitule") ?? "").trim(),
      type: data.get("type") as ProjectType,
      region: String(data.get("region") ?? ""),
      moa: String(data.get("moa") ?? "").trim(),
      lot: String(data.get("lot") ?? "").trim(),
      budgetTotal: Number(data.get("budgetTotal") ?? 0),
      budgetConsomme: Number(data.get("budgetConsomme") ?? 0),
      delaiRestantJours: Number(data.get("delaiRestantJours") ?? 0),
      lat: Number(data.get("lat") ?? 0),
      lng: Number(data.get("lng") ?? 0),
    });
    setBusy(false);
    if (ok) setEditOpen(false);
  }

  async function handleDelete() {
    setBusy(true);
    const ok = await deleteProjet(projet.id);
    setBusy(false);
    if (ok) setConfirmOpen(false);
  }

  async function handleDuplicate() {
    setMenuOpen(false);
    const id = await duplicateProjet(projet.id);
    if (id) router.push(`/projets/${id}`);
  }

  function handlePdf() {
    setMenuOpen(false);
    exportProjetPDF(projet);
  }

  return (
    <div className="pointer-events-auto relative z-20" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Actions du projet"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex h-8 w-8 items-center justify-center rounded-control border border-line text-slate hover:bg-surface hover:text-ink"
      >
        <MoreVertical size={16} aria-hidden />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lg"
        >
          <MenuItem icon={Pencil} label="Modifier" onClick={() => { setMenuOpen(false); setEditOpen(true); }} />
          <MenuItem icon={Copy} label="Dupliquer" onClick={handleDuplicate} />
          <MenuItem icon={FileDown} label="Exporter en PDF" onClick={handlePdf} />
          <div className="my-1 border-t border-line" />
          <MenuItem
            icon={Trash2}
            label="Supprimer"
            danger
            onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
          />
        </div>
      )}

      {/* Modale d'édition */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le projet">
        <form onSubmit={handleEdit} className="space-y-4">
          <Field label="Intitulé du projet" htmlFor="edit-intitule">
            <input id="edit-intitule" name="intitule" type="text" required defaultValue={projet.intitule} className="input" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type d'ouvrage" htmlFor="edit-type">
              <select id="edit-type" name="type" required defaultValue={projet.type} className="input">
                {TYPES.map((t) => (
                  <option key={t} value={t}>{PROJECT_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>

            <Field label="Région" htmlFor="edit-region">
              <select id="edit-region" name="region" required defaultValue={projet.region} className="input">
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>

            <Field label="Maître d'ouvrage (MOA)" htmlFor="edit-moa">
              <input id="edit-moa" name="moa" type="text" required defaultValue={projet.moa} className="input" />
            </Field>

            <Field label="Lot / marché" htmlFor="edit-lot">
              <input id="edit-lot" name="lot" type="text" required defaultValue={projet.lot} className="input" />
            </Field>

            <Field label="Budget total (FCFA)" htmlFor="edit-budgetTotal">
              <input id="edit-budgetTotal" name="budgetTotal" type="number" min={0} step={1000} required defaultValue={projet.budgetTotal} className="input" />
            </Field>

            <Field label="Budget consommé (FCFA)" htmlFor="edit-budgetConsomme">
              <input id="edit-budgetConsomme" name="budgetConsomme" type="number" min={0} step={1000} required defaultValue={projet.budgetConsomme} className="input" />
            </Field>

            <Field label="Délai restant (jours)" htmlFor="edit-delai">
              <input id="edit-delai" name="delaiRestantJours" type="number" step={1} required defaultValue={projet.delaiRestantJours} className="input" />
            </Field>

            <Field label="Latitude" htmlFor="edit-lat">
              <input id="edit-lat" name="lat" type="number" step="any" min={-90} max={90} required defaultValue={projet.lat} className="input" />
            </Field>

            <Field label="Longitude" htmlFor="edit-lng">
              <input id="edit-lng" name="lng" type="number" step="any" min={-180} max={180} required defaultValue={projet.lng} className="input" />
            </Field>
          </div>

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
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Supprimer le projet">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-state-late/10 text-state-late">
            <AlertTriangle size={20} aria-hidden />
          </span>
          <div className="text-sm text-slate">
            <p>
              Voulez-vous vraiment supprimer <span className="font-medium text-ink">{projet.intitule}</span> ?
            </p>
            <p className="mt-1 text-muted">
              Cette action est irréversible et supprimera aussi ses tâches, alertes et documents liés.
            </p>
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
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface ${
        danger ? "text-state-late" : "text-ink"
      }`}
    >
      <Icon size={15} aria-hidden /> {label}
    </button>
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
