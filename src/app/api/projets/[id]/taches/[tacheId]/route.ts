import { NextResponse } from "next/server";
import { updateTacheAvancement } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Met à jour l'avancement d'une tâche (BF-05) et recalcule l'état du projet.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; tacheId: string }> }
) {
  try {
    const { id, tacheId } = await params;
    const body = (await req.json()) as { avancement?: number };
    const projet = await updateTacheAvancement(id, tacheId, Number(body.avancement) || 0);
    if (!projet) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }
    return NextResponse.json({ projet });
  } catch (err) {
    console.error("PATCH /api/projets/[id]/taches/[tacheId]", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}
