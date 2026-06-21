import { NextResponse } from "next/server";
import { createEtape } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canGererStructure } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Ajoute une étape au projet (découpage — maître d'œuvre).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (!canGererStructure(session.role)) {
      return NextResponse.json({ error: "Découpage réservé au maître d'œuvre." }, { status: 403 });
    }
    const { id } = await params;
    const body = (await req.json()) as { intitule?: string };
    if (!body.intitule?.trim()) {
      return NextResponse.json({ error: "Intitulé requis." }, { status: 400 });
    }
    const projet = await createEtape(id, body.intitule.trim());
    if (!projet) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    return NextResponse.json({ projet }, { status: 201 });
  } catch (err) {
    console.error("POST /api/projets/[id]/etapes", err);
    return NextResponse.json({ error: "Erreur lors de l'ajout de l'étape." }, { status: 500 });
  }
}
