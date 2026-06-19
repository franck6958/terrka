import Link from "next/link";
import { Home } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <LogoMark size={56} />
      <h1>Page introuvable</h1>
      <p className="max-w-sm text-sm text-slate">
        La ressource demandée n&apos;existe pas ou a été déplacée.
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        <Home size={16} /> Retour au tableau de bord
      </Link>
    </main>
  );
}
