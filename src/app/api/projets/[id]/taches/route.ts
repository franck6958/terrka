import { NextResponse } from "next/server";
import { createTache } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canGererStructure } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Crée une tâche au sein d'une activité (maître d'œuvre + super-admin).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    if (!canGererStructure(session.role)) {
      return NextResponse.json({ error: "Création de tâche réservée au maître d'œuvre." }, { status: 403 });
    }
    const { id } = await params;
    const body = (await req.json()) as { activiteId?: string; intitule?: string; responsable?: string; echeance?: string | null };
    if (!body.activiteId || !body.intitule?.trim()) {
      return NextResponse.json({ error: "Activité et intitulé requis." }, { status: 400 });
    }
    const projet = await createTache(id, {
      activiteId: body.activiteId,
      intitule: body.intitule.trim(),
      responsable: body.responsable ?? "",
      echeance: body.echeance ?? null,
    });
    if (!projet) return NextResponse.json({ error: "Activité introuvable." }, { status: 404 });
    return NextResponse.json({ projet }, { status: 201 });
  } catch (err) {
    console.error("POST /api/projets/[id]/taches", err);
    return NextResponse.json({ error: "Erreur lors de la création de la tâche." }, { status: 500 });
  }
}
