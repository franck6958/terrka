import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { canAccess } from "@/lib/rbac";

// Protège les modules applicatifs (BF-01/02). La vitrine « / », « /connexion »
// et les routes « /api » restent publiques (cf. matcher).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  // Non authentifié → redirection vers la connexion (avec retour).
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authentifié mais rôle insuffisant pour ce module → renvoi au tableau de bord.
  if (!canAccess(session.role, pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projets/:path*",
    "/carte/:path*",
    "/alertes/:path*",
    "/documents/:path*",
    "/rapports/:path*",
    "/utilisateurs/:path*",
    "/journal/:path*",
  ],
};
