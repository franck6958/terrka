import { NextResponse } from "next/server";
import { createUtilisateur, type NewUtilisateurInput } from "@/lib/queries";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Crée un compte utilisateur (BF-02). Le compte reçoit le mot de passe par
// défaut (cf. README) ; un changement au premier login relève d'une phase ultérieure.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<NewUtilisateurInput>;
    if (!body.nom || !body.email || !body.role) {
      return NextResponse.json({ error: "Nom, e-mail et rôle sont requis." }, { status: 400 });
    }
    const motDePasseHash = await hashPassword(DEFAULT_PASSWORD);
    const utilisateur = await createUtilisateur(
      { nom: body.nom, email: body.email, role: body.role },
      motDePasseHash
    );
    return NextResponse.json({ utilisateur }, { status: 201 });
  } catch (err) {
    console.error("POST /api/utilisateurs", err);
    // Violation de contrainte d'unicité de l'e-mail.
    const message =
      err instanceof Error && /unique|duplicate/i.test(err.message)
        ? "Un compte avec cet e-mail existe déjà."
        : "Erreur lors de la création du compte.";
    const status = message.includes("existe déjà") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
