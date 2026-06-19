import { NextResponse } from "next/server";
import { createProjet, type NewProjetInput } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Crée un nouveau projet (BF-04).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<NewProjetInput>;
    if (!body.intitule || !body.type || !body.region) {
      return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }
    const projet = await createProjet({
      intitule: body.intitule,
      type: body.type,
      region: body.region,
      moa: body.moa ?? "",
      lot: body.lot ?? "",
      budgetTotal: Number(body.budgetTotal) || 0,
      delaiRestantJours: Number(body.delaiRestantJours) || 0,
      lat: Number(body.lat) || 0,
      lng: Number(body.lng) || 0,
    });
    return NextResponse.json({ projet }, { status: 201 });
  } catch (err) {
    console.error("POST /api/projets", err);
    return NextResponse.json({ error: "Erreur lors de la création du projet." }, { status: 500 });
  }
}
