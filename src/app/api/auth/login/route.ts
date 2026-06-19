import { NextResponse } from "next/server";
import { getUtilisateurAuth } from "@/lib/queries";
import { verifyPassword } from "@/lib/auth";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export const dynamic = "force-dynamic";

// Authentification par e-mail + mot de passe (BF-01). Émet un cookie de session signé.
export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
    }

    const found = await getUtilisateurAuth(email.trim().toLowerCase());
    // Message volontairement générique (pas de divulgation de l'existence du compte).
    const invalid = NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });

    if (!found || !found.hash) return invalid;
    const ok = await verifyPassword(password, found.hash);
    if (!ok) return invalid;

    if (!found.utilisateur.actif) {
      return NextResponse.json({ error: "Ce compte est désactivé." }, { status: 403 });
    }

    const { utilisateur } = found;
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
    console.error("POST /api/auth/login", err);
    return NextResponse.json({ error: "Erreur lors de la connexion." }, { status: 500 });
  }
}
