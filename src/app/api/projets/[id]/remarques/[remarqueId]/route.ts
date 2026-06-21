import { NextResponse } from "next/server";
import { deleteRemarque } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canRemarquer } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Supprime une remarque (maître d'ouvrage + super-administrateur).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; remarqueId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (!canRemarquer(session.role)) {
      return NextResponse.json({ error: "Action réservée au maître d'ouvrage et au super-administrateur." }, { status: 403 });
    }
    const { id, remarqueId } = await params;
    const projet = await deleteRemarque(id, remarqueId);
    if (!projet) return NextResponse.json({ error: "Remarque introuvable." }, { status: 404 });
    return NextResponse.json({ projet });
  } catch (err) {
    console.error("DELETE /api/projets/[id]/remarques/[remarqueId]", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de la remarque." }, { status: 500 });
  }
}
