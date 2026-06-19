"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, User, KeyRound, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABEL } from "@/lib/status";
import type { Role } from "@/lib/types";

export default function ProfilPage() {
  const router = useRouter();
  const { user } = useAuth();

  // — Informations personnelles —
  const [savingInfos, setSavingInfos] = useState(false);
  const [infosMsg, setInfosMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // — Mot de passe —
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!user) return null;

  const initiales = user.nom.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = ROLE_LABEL[user.role as Role] ?? user.role;

  async function handleInfos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingInfos(true);
    setInfosMsg(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: String(data.get("nom") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setInfosMsg({ type: "ok", text: "Profil mis à jour." });
      // Recharge les composants serveur (Topbar, layout) avec la nouvelle session.
      router.refresh();
    } catch (err) {
      setInfosMsg({ type: "err", text: err instanceof Error ? err.message : "Échec de la mise à jour." });
    } finally {
      setSavingInfos(false);
    }
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdMsg(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const nouveau = String(data.get("nouveau") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (nouveau !== confirmation) {
      setPwdMsg({ type: "err", text: "La confirmation ne correspond pas au nouveau mot de passe." });
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/profil/mot-de-passe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actuel: String(data.get("actuel") ?? ""), nouveau }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setPwdMsg({ type: "ok", text: "Mot de passe modifié." });
      form.reset();
    } catch (err) {
      setPwdMsg({ type: "err", text: err instanceof Error ? err.message : "Échec du changement." });
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <>
      <Topbar title="Mon profil" />
      <main className="space-y-5 p-5 lg:p-6">
        {/* En-tête identité */}
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-white">
            {initiales}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">{user.nom}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-slate">
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Informations personnelles */}
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <User size={18} className="text-brand-interactive" aria-hidden /> Informations personnelles
            </h2>
            <form onSubmit={handleInfos} className="mt-4 space-y-4">
              <label htmlFor="nom" className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate">Nom complet</span>
                <input id="nom" name="nom" type="text" required defaultValue={user.nom} className="input" />
              </label>

              <label htmlFor="email" className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate">Adresse e-mail</span>
                <input id="email" name="email" type="email" required defaultValue={user.email} className="input" />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate">Rôle</span>
                <input type="text" value={roleLabel} disabled className="input bg-surface text-muted" />
                <span className="mt-1.5 block text-xs text-muted">
                  Le rôle est géré par un administrateur.
                </span>
              </label>

              {infosMsg && <Feedback msg={infosMsg} />}

              <div className="flex justify-end">
                <button type="submit" disabled={savingInfos} className="btn btn-primary disabled:opacity-60">
                  <Save size={16} /> {savingInfos ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </section>

          {/* Mot de passe */}
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <KeyRound size={18} className="text-brand-interactive" aria-hidden /> Mot de passe
            </h2>
            <form onSubmit={handlePassword} className="mt-4 space-y-4">
              <label htmlFor="actuel" className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate">Mot de passe actuel</span>
                <input id="actuel" name="actuel" type="password" required autoComplete="current-password" className="input" />
              </label>

              <label htmlFor="nouveau" className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate">Nouveau mot de passe</span>
                <input id="nouveau" name="nouveau" type="password" required minLength={8} autoComplete="new-password" className="input" />
                <span className="mt-1.5 block text-xs text-muted">Au moins 8 caractères.</span>
              </label>

              <label htmlFor="confirmation" className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate">Confirmer le nouveau mot de passe</span>
                <input id="confirmation" name="confirmation" type="password" required minLength={8} autoComplete="new-password" className="input" />
              </label>

              {pwdMsg && <Feedback msg={pwdMsg} />}

              <div className="flex justify-end">
                <button type="submit" disabled={savingPwd} className="btn btn-primary disabled:opacity-60">
                  <KeyRound size={16} /> {savingPwd ? "Modification…" : "Changer le mot de passe"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}

function Feedback({ msg }: { msg: { type: "ok" | "err"; text: string } }) {
  return (
    <p
      className={`flex items-center gap-1.5 text-sm ${
        msg.type === "ok" ? "text-state-ontime" : "text-state-late"
      }`}
      role="status"
    >
      {msg.type === "ok" && <CheckCircle2 size={15} aria-hidden />}
      {msg.text}
    </p>
  );
}
