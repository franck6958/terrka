import { NextResponse } from "next/server";
import { getUtilisateurHash, setMotDePasseHash } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MIN_LENGTH = 8;

// Changement de mot de passe de l'utilisateur connecté (BF-01).
// Vérifie le mot de passe actuel avant d'enregistrer le nouveau.
export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = (await req.json()) as { actuel?: string; nouveau?: string };
    const actuel = body.actuel ?? "";
    const nouveau = body.nouveau ?? "";

    if (!actuel || !nouveau) {
      return NextResponse.json({ error: "Mot de passe actuel et nouveau requis." }, { status: 400 });
    }
    if (nouveau.length < MIN_LENGTH) {
      return NextResponse.json(
        { error: `Le nouveau mot de passe doit comporter au moins ${MIN_LENGTH} caractères.` },
        { status: 400 }
      );
    }

    const hash = await getUtilisateurHash(session.sub);
    if (hash === undefined) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
    if (!hash || !(await verifyPassword(actuel, hash))) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 403 });
    }

    await setMotDePasseHash(session.sub, await hashPassword(nouveau));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/profil/mot-de-passe", err);
    return NextResponse.json({ error: "Erreur lors du changement de mot de passe." }, { status: 500 });
  }
}
