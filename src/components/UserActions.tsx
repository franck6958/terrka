"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Pencil,
  KeyRound,
  Trash2,
  Save,
  AlertTriangle,
  RefreshCw,
  Power,
  PowerOff,
} from "lucide-react";
import { Modal } from "./Modal";
import { useStore } from "@/lib/store";
import type { Utilisateur } from "@/lib/types";

// Menu d'actions d'un compte (BF-02) : Modifier, (Dés)activer, Réinitialiser le
// mot de passe, Supprimer. `self` = ligne de l'utilisateur connecté (suppression interdite).
export function UserActions({ utilisateur, self = false }: { utilisateur: Utilisateur; self?: boolean }) {
  const { setUtilisateurActif, updateUtilisateur, resetMotDePasseUtilisateur, deleteUtilisateur } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [pwdDone, setPwdDone] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = new FormData(e.currentTarget);
    const ok = await updateUtilisateur(utilisateur.id, {
      nom: String(data.get("nom") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
    });
    setBusy(false);
    if (ok) setEditOpen(false);
  }

  function genererMotDePasse() {
    // Mot de passe aléatoire lisible (12 caractères).
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    setMotDePasse(Array.from(bytes, (b) => alphabet[b % alphabet.length]).join(""));
  }

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const ok = await resetMotDePasseUtilisateur(utilisateur.id, motDePasse);
    setBusy(false);
    if (ok) setPwdDone(true);
  }

  function openReset() {
    setMenuOpen(false);
    setMotDePasse("");
    setPwdDone(false);
    setPwdOpen(true);
  }

  async function handleDelete() {
    setBusy(true);
    const ok = await deleteUtilisateur(utilisateur.id);
    setBusy(false);
    if (ok) setConfirmOpen(false);
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={`Actions pour ${utilisateur.nom}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex h-8 w-8 items-center justify-center rounded-control border border-line text-slate hover:bg-surface hover:text-ink"
      >
        <MoreVertical size={16} aria-hidden />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-card border border-line bg-white py-1 shadow-lg"
        >
          <MenuItem icon={Pencil} label="Modifier (nom, e-mail)" onClick={() => { setMenuOpen(false); setEditOpen(true); }} />
          <MenuItem
            icon={utilisateur.actif ? PowerOff : Power}
            label={utilisateur.actif ? "Désactiver le compte" : "Activer le compte"}
            onClick={() => { setMenuOpen(false); setUtilisateurActif(utilisateur.id, !utilisateur.actif); }}
          />
          <MenuItem icon={KeyRound} label="Réinitialiser le mot de passe" onClick={openReset} />
          {!self && (
            <>
              <div className="my-1 border-t border-line" />
              <MenuItem icon={Trash2} label="Supprimer" danger onClick={() => { setMenuOpen(false); setConfirmOpen(true); }} />
            </>
          )}
        </div>
      )}

      {/* Modale d'édition nom / e-mail */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le compte">
        <form onSubmit={handleEdit} className="space-y-4">
          <label htmlFor={`edit-nom-${utilisateur.id}`} className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Nom complet</span>
            <input id={`edit-nom-${utilisateur.id}`} name="nom" type="text" required defaultValue={utilisateur.nom} className="input" />
          </label>
          <label htmlFor={`edit-email-${utilisateur.id}`} className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Adresse e-mail</span>
            <input id={`edit-email-${utilisateur.id}`} name="email" type="email" required defaultValue={utilisateur.email} className="input" />
          </label>
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={() => setEditOpen(false)} className="btn btn-secondary">Annuler</button>
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
              <Save size={16} /> {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modale de réinitialisation du mot de passe */}
      <Modal open={pwdOpen} onClose={() => setPwdOpen(false)} title="Réinitialiser le mot de passe">
        {pwdDone ? (
          <div className="space-y-4">
            <p className="text-sm text-slate">
              Le mot de passe de <span className="font-medium text-ink">{utilisateur.nom}</span> a été réinitialisé.
              Communiquez-le lui de façon sécurisée :
            </p>
            <p className="rounded-control border border-line bg-surface px-3 py-2 text-center font-mono text-sm text-ink">
              {motDePasse}
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={() => setPwdOpen(false)} className="btn btn-primary">Terminé</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-slate">
              Définissez un nouveau mot de passe pour <span className="font-medium text-ink">{utilisateur.nom}</span> (8 caractères minimum).
            </p>
            <label htmlFor={`pwd-${utilisateur.id}`} className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate">Nouveau mot de passe</span>
              <div className="flex gap-2">
                <input
                  id={`pwd-${utilisateur.id}`}
                  type="text"
                  required
                  minLength={8}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  className="input"
                />
                <button type="button" onClick={genererMotDePasse} className="btn btn-secondary shrink-0" title="Générer">
                  <RefreshCw size={16} /> Générer
                </button>
              </div>
            </label>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={() => setPwdOpen(false)} className="btn btn-secondary">Annuler</button>
              <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
                <KeyRound size={16} /> {busy ? "Enregistrement…" : "Réinitialiser"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation de suppression */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Supprimer le compte">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-state-late/10 text-state-late">
            <AlertTriangle size={20} aria-hidden />
          </span>
          <div className="text-sm text-slate">
            <p>
              Voulez-vous vraiment supprimer le compte de{" "}
              <span className="font-medium text-ink">{utilisateur.nom}</span> ?
            </p>
            <p className="mt-1 text-muted">Cette action est irréversible.</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={() => setConfirmOpen(false)} className="btn btn-secondary">Annuler</button>
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
