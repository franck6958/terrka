import { NextResponse } from "next/server";
import { createContact, type ContactInput } from "@/lib/queries";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Enregistre une demande de contact depuis la vitrine publique.
// Route publique (non couverte par le middleware d'authentification).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ContactInput>;
    const nom = (body.nom ?? "").trim();
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();
    const organisation = (body.organisation ?? "").trim() || undefined;

    if (!nom || !email || !message) {
      return NextResponse.json({ error: "Nom, e-mail et message sont obligatoires." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "Message trop long (4000 caractères maximum)." }, { status: 400 });
    }

    const { id } = await createContact({ nom, organisation, email, message });
    return NextResponse.json({ id, ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/contact", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi de la demande." }, { status: 500 });
  }
}
