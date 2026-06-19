"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/Logo";

// Authentification réelle par e-mail + mot de passe selon le rôle (BF-01 / BNF-03).
export default function ConnexionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Connexion impossible.");
        setLoading(false);
        return;
      }
      // Destination demandée par le middleware (?next=…), sinon le tableau de bord.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Le service d'authentification est indisponible.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={44} onDark />
        </div>

        <div className="card p-6">
          <h1 className="text-xl">Connexion</h1>
          <p className="mt-1 text-sm text-muted">Accédez à votre espace selon votre rôle.</p>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-control bg-state-late/10 px-3 py-2 text-sm text-state-late"
            >
              <AlertTriangle size={15} aria-hidden /> {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate">Adresse e-mail</span>
              <span className="flex items-center gap-2 rounded-control border border-line bg-surface px-3 focus-within:border-brand-interactive">
                <Mail size={16} className="text-muted" />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nom@organisation.cm"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate">Mot de passe</span>
              <span className="flex items-center gap-2 rounded-control border border-line bg-surface px-3 focus-within:border-brand-interactive">
                <Lock size={16} className="text-muted" />
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </span>
            </label>

            <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-60">
              <LogIn size={16} /> {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            <Link href="/" className="text-brand-interactive hover:underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          TREKKA — Monitoring des projets d&apos;infrastructures BTP · Cameroun
        </p>
      </div>
    </main>
  );
}
