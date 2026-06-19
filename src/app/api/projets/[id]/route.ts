import { NextResponse } from "next/server";
import { updateProjet, deleteProjet, type UpdateProjetInput } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { canManageProjets } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Garde d'accès : seuls les rôles de pilotage gèrent les projets (BF-02).
async function ensureCanManage(): Promise<NextResponse | null> {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!canManageProjets(session.role)) {
    return NextResponse.json({ error: "Action non autorisée pour votre rôle." }, { status: 403 });
  }
  return null;
}

// Modifie un projet (BF-04).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await ensureCanManage();
    if (denied) return denied;

    const { id } = await params;
    const body = (await req.json()) as Partial<UpdateProjetInput>;
    if (!body.intitule || !body.type || !body.region) {
      return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    const projet = await updateProjet(id, {
      intitule: body.intitule,
      type: body.type,
      region: body.region,
      moa: body.moa ?? "",
      lot: body.lot ?? "",
      budgetTotal: Number(body.budgetTotal) || 0,
      budgetConsomme: Number(body.budgetConsomme) || 0,
      delaiRestantJours: Number(body.delaiRestantJours) || 0,
      lat: Number(body.lat) || 0,
      lng: Number(body.lng) || 0,
    });
    if (!projet) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    return NextResponse.json({ projet });
  } catch (err) {
    console.error("PATCH /api/projets/[id]", err);
    return NextResponse.json({ error: "Erreur lors de la modification du projet." }, { status: 500 });
  }
}

// Supprime un projet et ses données liées (BF-04).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await ensureCanManage();
    if (denied) return denied;

    const { id } = await params;
    const ok = await deleteProjet(id);
    if (!ok) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/projets/[id]", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du projet." }, { status: 500 });
  }
}
