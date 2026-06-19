import { NextResponse } from "next/server";
import {
  setUtilisateurActif,
  setUtilisateurRole,
  deleteUtilisateur,
  adminUpdateUtilisateur,
  adminResetMotDePasse,
} from "@/lib/queries";
import { getSessionUser, hashPassword } from "@/lib/auth";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const MIN_PASSWORD = 8;

const ROLES: Role[] = [
  "super-admin",
  "moa",
  "moe",
  "chef-chantier",
  "ouvrier",
  "controle",
  "bailleur",
];

// Met à jour un compte : activation/désactivation ou changement de rôle (BF-02).
// Réservé au super-administrateur.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (session.role !== "super-admin") {
      return NextResponse.json({ error: "Réservé au super-administrateur." }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as {
      actif?: boolean;
      role?: string;
      nom?: string;
      email?: string;
      motDePasse?: string;
    };

    // — Modification nom / e-mail —
    if (typeof body.nom === "string" || typeof body.email === "string") {
      const nom = (body.nom ?? "").trim();
      const email = (body.email ?? "").trim().toLowerCase();
      if (!nom || !email) {
        return NextResponse.json({ error: "Nom et e-mail sont requis." }, { status: 400 });
      }
      try {
        const utilisateur = await adminUpdateUtilisateur(id, { nom, email });
        if (!utilisateur) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
        return NextResponse.json({ utilisateur });
      } catch (e) {
        if (e instanceof Error && /unique|duplicate/i.test(e.message)) {
          return NextResponse.json({ error: "Un compte avec cet e-mail existe déjà." }, { status: 409 });
        }
        throw e;
      }
    }

    // — Réinitialisation du mot de passe —
    if (typeof body.motDePasse === "string") {
      if (body.motDePasse.length < MIN_PASSWORD) {
        return NextResponse.json(
          { error: `Le mot de passe doit comporter au moins ${MIN_PASSWORD} caractères.` },
          { status: 400 }
        );
      }
      const utilisateur = await adminResetMotDePasse(id, await hashPassword(body.motDePasse));
      if (!utilisateur) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
      return NextResponse.json({ utilisateur });
    }

    // — Changement de rôle —
    if (typeof body.role === "string") {
      if (!ROLES.includes(body.role as Role)) {
        return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
      }
      // Garde-fou : un administrateur ne peut pas changer son propre rôle (risque de verrouillage).
      if (id === session.sub) {
        return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 400 });
      }
      const utilisateur = await setUtilisateurRole(id, body.role as Role);
      if (!utilisateur) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
      return NextResponse.json({ utilisateur });
    }

    // — Activation / désactivation —
    if (typeof body.actif === "boolean") {
      const utilisateur = await setUtilisateurActif(id, body.actif);
      if (!utilisateur) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
      return NextResponse.json({ utilisateur });
    }

    return NextResponse.json({ error: "Aucune modification valide fournie." }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/utilisateurs/[id]", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du compte." }, { status: 500 });
  }
}

// Supprime un compte (BF-02). Réservé au super-administrateur ; pas d'auto-suppression.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (session.role !== "super-admin") {
      return NextResponse.json({ error: "Réservé au super-administrateur." }, { status: 403 });
    }

    const { id } = await params;
    if (id === session.sub) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
    }

    const ok = await deleteUtilisateur(id);
    if (!ok) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/utilisateurs/[id]", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du compte." }, { status: 500 });
  }
}
