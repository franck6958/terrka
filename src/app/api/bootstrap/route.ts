import { NextResponse } from "next/server";
import { getProjets, getAlertes, getUtilisateurs, getDocuments } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Charge l'état initial de l'application depuis la base
// (projets, alertes, utilisateurs, documents).
export async function GET() {
  try {
    const [projets, alertes, utilisateurs, documents] = await Promise.all([
      getProjets(),
      getAlertes(),
      getUtilisateurs(),
      getDocuments(),
    ]);
    return NextResponse.json({ projets, alertes, utilisateurs, documents });
  } catch (err) {
    console.error("GET /api/bootstrap", err);
    return NextResponse.json({ error: "Erreur de lecture de la base." }, { status: 500 });
  }
}
