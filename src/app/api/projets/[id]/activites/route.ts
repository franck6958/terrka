import { NextResponse } from "next/server";
import { createActivite } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canGererStructure } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Ajoute une activité à une étape (découpage — maître d'œuvre).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (!canGererStructure(session.role)) {
      return NextResponse.json({ error: "Découpage réservé au maître d'œuvre." }, { status: 403 });
    }
    const { id } = await params;
    const body = (await req.json()) as { etapeId?: string; intitule?: string };
    if (!body.etapeId || !body.intitule?.trim()) {
      return NextResponse.json({ error: "Étape et intitulé requis." }, { status: 400 });
    }
    const projet = await createActivite(id, body.etapeId, body.intitule.trim());
    if (!projet) return NextResponse.json({ error: "Étape introuvable." }, { status: 404 });
    return NextResponse.json({ projet }, { status: 201 });
  } catch (err) {
    console.error("POST /api/projets/[id]/activites", err);
    return NextResponse.json({ error: "Erreur lors de l'ajout de l'activité." }, { status: 500 });
  }
}
