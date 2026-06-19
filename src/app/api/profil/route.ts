import { NextResponse } from "next/server";
import { updateUtilisateurProfil, type UpdateProfilInput } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export const dynamic = "force-dynamic";

// Met à jour le profil de l'utilisateur connecté (nom, e-mail) — BF-01.
// Le nom/e-mail étant inscrits dans le jeton de session, on réémet le cookie.
export async function PATCH(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = (await req.json()) as Partial<UpdateProfilInput>;
    const nom = (body.nom ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    if (!nom || !email) {
      return NextResponse.json({ error: "Nom et e-mail sont requis." }, { status: 400 });
    }

    const utilisateur = await updateUtilisateurProfil(session.sub, { nom, email });
    if (!utilisateur) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    // Réémission de la session avec les nouvelles valeurs (rôle/expiration inchangés).
    const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
    const token = await signSession({
      sub: utilisateur.id,
      nom: utilisateur.nom,
      role: utilisateur.role,
      email: utilisateur.email,
      exp,
    });

    const res = NextResponse.json({ utilisateur });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("PATCH /api/profil", err);
    const message =
      err instanceof Error && /unique|duplicate/i.test(err.message)
        ? "Un compte avec cet e-mail existe déjà."
        : "Erreur lors de la mise à jour du profil.";
    const status = message.includes("existe déjà") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
