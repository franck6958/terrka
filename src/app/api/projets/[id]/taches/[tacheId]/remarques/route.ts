import { NextResponse } from "next/server";
import { addRemarque } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canRemarquer } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Ajoute une remarque sur une tâche (maître d'ouvrage + super-administrateur).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; tacheId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (!canRemarquer(session.role)) {
      return NextResponse.json({ error: "Remarque réservée au maître d'ouvrage et au super-administrateur." }, { status: 403 });
    }
    const { id, tacheId } = await params;
    const body = (await req.json()) as { contenu?: string };
    if (!body.contenu?.trim()) {
      return NextResponse.json({ error: "Remarque vide." }, { status: 400 });
    }
    const projet = await addRemarque(id, tacheId, body.contenu.trim());
    if (!projet) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    return NextResponse.json({ projet }, { status: 201 });
  } catch (err) {
    console.error("POST /api/projets/[id]/taches/[tacheId]/remarques", err);
    return NextResponse.json({ error: "Erreur lors de l'ajout de la remarque." }, { status: 500 });
  }
}
