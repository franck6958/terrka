import { NextResponse } from "next/server";
import {
  updateTacheAvancement,
  updateTache,
  deleteTache,
  setTacheOuvriers,
  demanderClotureTache,
  statuerClotureTache,
  VerrouillageError,
  ClotureError,
  type UpdateTacheInput,
} from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canGererStructure, canMajAvancement, canDemanderCloture, canValiderCloture } from "@/lib/rbac";

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
      clotureDemande?: boolean;
      validation?: "valider" | "refuser";
      motif?: string;
    };

    // Déclaration de clôture par l'ouvrier affecté (en attente de validation MOE).
    if (body.clotureDemande === true) {
      if (!canDemanderCloture(session.role)) {
        return NextResponse.json({ error: "Action réservée aux ouvriers affectés." }, { status: 403 });
      }
      const projet = await demanderClotureTache(id, tacheId, session.sub);
      if (!projet) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
      return NextResponse.json({ projet });
    }

    // Validation / refus de la clôture par le maître d'œuvre ou le chef de chantier.
    if (body.validation === "valider" || body.validation === "refuser") {
      if (!canValiderCloture(session.role)) {
        return NextResponse.json({ error: "Validation de clôture non autorisée pour votre rôle." }, { status: 403 });
      }
      const valider = body.validation === "valider";
      if (!valider && !(body.motif ?? "").trim()) {
        return NextResponse.json({ error: "Un motif est requis pour refuser la clôture." }, { status: 400 });
      }
      const projet = await statuerClotureTache(id, tacheId, valider, body.motif);
      if (!projet) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
      return NextResponse.json({ projet });
    }

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
    if (err instanceof VerrouillageError || err instanceof ClotureError) {
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
