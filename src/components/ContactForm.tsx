"use client";

import { useState } from "react";
import { Mail, CheckCircle2, AlertTriangle } from "lucide-react";

type Etat = "idle" | "envoi" | "ok" | "erreur";

// Formulaire de contact de la vitrine — enregistre la demande via POST /api/contact.
export function ContactForm() {
  const [etat, setEtat] = useState<Etat>("idle");
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEtat("envoi");
    setErreur(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: String(data.get("nom") ?? ""),
          organisation: String(data.get("organisation") ?? ""),
          email: String(data.get("email") ?? ""),
          message: String(data.get("message") ?? ""),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErreur(body.error ?? "Envoi impossible. Réessayez.");
        setEtat("erreur");
        return;
      }
      form.reset();
      setEtat("ok");
    } catch {
      setErreur("Le service est momentanément indisponible.");
      setEtat("erreur");
    }
  }

  if (etat === "ok") {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 size={32} className="text-state-ontime" />
        <h3 className="font-heading text-lg">Demande envoyée</h3>
        <p className="text-sm text-slate">
          Merci&nbsp;! Votre demande a bien été enregistrée. Notre équipe vous recontactera rapidement.
        </p>
        <button type="button" onClick={() => setEtat("idle")} className="btn btn-secondary mt-2">
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      {etat === "erreur" && erreur && (
        <div role="alert" className="flex items-center gap-2 rounded-control bg-state-late/10 px-3 py-2 text-sm text-state-late">
          <AlertTriangle size={15} aria-hidden /> {erreur}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate">Nom complet</span>
          <input type="text" name="nom" required placeholder="Votre nom" className="input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate">Organisation</span>
          <input type="text" name="organisation" placeholder="Ministère, entreprise…" className="input" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate">E-mail</span>
        <input type="email" name="email" required placeholder="nom@organisation.cm" className="input" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate">Message</span>
        <textarea
          name="message"
          rows={4}
          required
          maxLength={4000}
          placeholder="Décrivez votre besoin (nombre de projets, déploiement souhaité…)"
          className="input h-auto py-2"
        />
      </label>
      <button type="submit" disabled={etat === "envoi"} className="btn btn-primary w-full disabled:opacity-60">
        <Mail size={16} /> {etat === "envoi" ? "Envoi…" : "Envoyer la demande"}
      </button>
    </form>
  );
}
