import { NextResponse } from "next/server";
import { setProjetStatut } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canManageProjets } from "@/lib/rbac";
import type { StatusKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID: StatusKey[] = ["ontime", "risk", "late", "done", "paused"];

// Change le statut d'un projet (BF-04). Réservé aux rôles de pilotage (BF-02).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (!canManageProjets(session.role)) {
      return NextResponse.json({ error: "Action non autorisée pour votre rôle." }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json()) as { statut?: string };
    if (!body.statut || !VALID.includes(body.statut as StatusKey)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const projet = await setProjetStatut(id, body.statut as StatusKey);
    if (!projet) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    return NextResponse.json({ projet });
  } catch (err) {
    console.error("PATCH /api/projets/[id]/statut", err);
    return NextResponse.json({ error: "Erreur lors du changement de statut." }, { status: 500 });
  }
}
