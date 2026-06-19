import { NextResponse } from "next/server";
import { createDocument, formatTaille, type NewDocumentInput } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Taille maximale d'un fichier téléversé. Le contenu est stocké en base64 dans
// Postgres (Neon) ; on reste donc volontairement modeste pour préserver la base
// et rester sous les limites du driver HTTP serverless.
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 Mo

interface UploadBody extends Partial<NewDocumentInput> {
  /** Contenu encodé en base64 (sans le préfixe data:). */
  contenu?: string | null;
  mime?: string | null;
}

// Enregistre un document rattaché à un projet (BF-09).
// Le contenu réel du fichier (base64) est facultatif : si absent, seules les
// métadonnées sont persistées (rétrocompatible avec l'ancien comportement).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UploadBody;
    if (!body.nom || !body.type || !body.projetId) {
      return NextResponse.json({ error: "Nom, type et projet sont requis." }, { status: 400 });
    }

    let taille = (body.taille ?? "").trim() || "—";
    let contenu: string | null = null;

    if (body.contenu) {
      // Taille réelle déduite de la longueur base64 (3 octets pour 4 caractères).
      const base64 = body.contenu.includes(",")
        ? body.contenu.slice(body.contenu.indexOf(",") + 1)
        : body.contenu;
      const octets = Math.floor((base64.length * 3) / 4);
      if (octets > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `Fichier trop volumineux (max ${formatTaille(MAX_FILE_BYTES)}).` },
          { status: 413 }
        );
      }
      contenu = base64;
      taille = formatTaille(octets);
    }

    const document = await createDocument({
      projetId: body.projetId,
      nom: body.nom,
      type: body.type,
      taille,
      contenu,
      mime: body.mime ?? null,
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents", err);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du document." }, { status: 500 });
  }
}
