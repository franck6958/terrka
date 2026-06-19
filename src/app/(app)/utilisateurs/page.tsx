"use client";

import { useState } from "react";
import { UserPlus, ShieldCheck, CircleCheck, CircleSlash } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Modal } from "@/components/Modal";
import { RoleSelect } from "@/components/RoleSelect";
import { UserActions } from "@/components/UserActions";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABEL } from "@/lib/status";
import type { Role } from "@/lib/types";

const ROLES = Object.keys(ROLE_LABEL) as Role[];

export default function UtilisateursPage() {
  const { utilisateurs, hydrated, addUtilisateur } = useStore();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    const ok = await addUtilisateur({
      nom: String(data.get("nom") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      role: data.get("role") as Role,
    });
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <>
      <Topbar title="Utilisateurs & rôles" />
      <main className="space-y-5 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate">
            <ShieldCheck size={15} /> Gestion des comptes, des rôles et des droits d&apos;accès (BF-02).
          </p>
          <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
            <UserPlus size={16} /> Ajouter un utilisateur
          </button>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {utilisateurs.map((u) => (
                <tr key={u.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                        {u.nom.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                      <span className="font-medium text-ink">{u.nom}</span>
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleSelect utilisateur={u} self={u.id === user?.id} />
                  </td>
                  <td className="px-4 py-3">
                    {u.actif ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-state-ontime">
                        <CircleCheck size={14} /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                        <CircleSlash size={14} /> Désactivé
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <UserActions utilisateur={u} self={u.id === user?.id} />
                    </div>
                  </td>
                </tr>
              ))}

              {hydrated && utilisateurs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                    Aucun utilisateur. Cliquez sur « Ajouter un utilisateur » pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un utilisateur">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="nom" className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Nom complet</span>
            <input id="nom" name="nom" type="text" required placeholder="Ex. Jeanne Mballa" className="input" />
          </label>

          <label htmlFor="email" className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Adresse e-mail</span>
            <input id="email" name="email" type="email" required placeholder="nom@organisation.cm" className="input" />
          </label>

          <label htmlFor="role" className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Rôle</span>
            <select id="role" name="role" required defaultValue="" className="input">
              <option value="" disabled>
                Sélectionner un rôle…
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
              {saving ? "Création…" : "Créer le compte"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
