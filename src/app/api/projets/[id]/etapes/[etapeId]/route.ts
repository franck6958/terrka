import { NextResponse } from "next/server";
import { updateEtape, deleteEtape } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canGererStructure } from "@/lib/rbac";

export const dynamic = "force-dynamic";

async function guard(): Promise<NextResponse | null> {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!canGererStructure(session.role)) {
    return NextResponse.json({ error: "Découpage réservé au maître d'œuvre." }, { status: 403 });
  }
  return null;
}

// Renomme une étape (maître d'œuvre).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; etapeId: string }> }) {
  try {
    const denied = await guard();
    if (denied) return denied;
    const { id, etapeId } = await params;
    const body = (await req.json()) as { intitule?: string };
    if (!body.intitule?.trim()) return NextResponse.json({ error: "Intitulé requis." }, { status: 400 });
    const projet = await updateEtape(id, etapeId, body.intitule.trim());
    if (!projet) return NextResponse.json({ error: "Étape introuvable." }, { status: 404 });
    return NextResponse.json({ projet });
  } catch (err) {
    console.error("PATCH /api/projets/[id]/etapes/[etapeId]", err);
    return NextResponse.json({ error: "Erreur lors de la modification de l'étape." }, { status: 500 });
  }
}

// Supprime une étape et tout ce qu'elle contient (maître d'œuvre).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; etapeId: string }> }) {
  try {
    const denied = await guard();
    if (denied) return denied;
    const { id, etapeId } = await params;
    const projet = await deleteEtape(id, etapeId);
    if (!projet) return NextResponse.json({ error: "Étape introuvable." }, { status: 404 });
    return NextResponse.json({ projet });
  } catch (err) {
    console.error("DELETE /api/projets/[id]/etapes/[etapeId]", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'étape." }, { status: 500 });
  }
}
