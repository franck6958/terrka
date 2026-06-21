import { NextResponse } from "next/server";
import {
  updateTacheAvancement,
  updateTache,
  deleteTache,
  setTacheOuvriers,
  VerrouillageError,
  type UpdateTacheInput,
} from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canGererStructure, canMajAvancement } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// PATCH : met à jour l'avancement (terrain) OU les métadonnées / l'affectation
// d'une tâche selon le contenu du corps de la requête.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; tacheId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const { id, tacheId } = await params;
    const body = (await req.json()) as {
      avancement?: number;
      ouvrierIds?: string[];
      intitule?: string;
      responsable?: string;
      echeance?: string | null;
    };

    // Affectation d'ouvriers (maître d'œuvre).
    if (Array.isArray(body.ouvrierIds)) {
      if (!canGererStructure(session.role)) {
        return NextResponse.json({ error: "Seul le maître d'œuvre peut affecter une tâche." }, { status: 403 });
      }
      const projet = await setTacheOuvriers(id, tacheId, body.ouvrierIds);
      if (!projet) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
      return NextResponse.json({ projet });
    }

    // Modification des métadonnées de la tâche (maître d'œuvre + super-admin).
    if (body.intitule !== undefined) {
      if (!canGererStructure(session.role)) {
        return NextResponse.json({ error: "Modification réservée au maître d'œuvre." }, { status: 403 });
      }
      const input: UpdateTacheInput = { intitule: body.intitule, responsable: body.responsable, echeance: body.echeance ?? null };
      const projet = await updateTache(id, tacheId, input);
      if (!projet) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
      return NextResponse.json({ projet });
    }

    // Mise à jour de l'avancement (terrain).
    if (!canMajAvancement(session.role)) {
      return NextResponse.json({ error: "Mise à jour de l'avancement non autorisée pour votre rôle." }, { status: 403 });
    }
    const projet = await updateTacheAvancement(id, tacheId, Number(body.avancement) || 0);
    if (!projet) {
      return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    }
    return NextResponse.json({ projet });
  } catch (err) {
    if (err instanceof VerrouillageError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("PATCH /api/projets/[id]/taches/[tacheId]", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}

// Supprime une tâche (maître d'œuvre + super-admin).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; tacheId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (!canGererStructure(session.role)) {
      return NextResponse.json({ error: "Suppression réservée au maître d'œuvre." }, { status: 403 });
    }
    const { id, tacheId } = await params;
    const projet = await deleteTache(id, tacheId);
    if (!projet) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    return NextResponse.json({ projet });
  } catch (err) {
    console.error("DELETE /api/projets/[id]/taches/[tacheId]", err);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
