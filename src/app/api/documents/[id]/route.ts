import { NextResponse } from "next/server";
import {
  deleteDocument,
  getDocumentContenu,
  updateDocument,
  type UpdateDocumentInput,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

// Télécharge ou prévisualise le contenu réel d'un document (BF-09).
//   GET /api/documents/[id]              → téléchargement (attachment)
//   GET /api/documents/[id]?inline=1     → aperçu dans le navigateur (inline)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await getDocumentContenu(id);
    if (!doc) {
      return NextResponse.json(
        { error: "Aucun fichier disponible pour ce document." },
        { status: 404 }
      );
    }
    const buffer = Buffer.from(doc.contenu, "base64");
    const inline = new URL(req.url).searchParams.get("inline") === "1";
    const disposition = inline ? "inline" : "attachment";
    // Nom de fichier sûr pour l'en-tête (RFC 5987 pour les caractères non-ASCII).
    const filename = encodeURIComponent(doc.nom);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mime ?? "application/octet-stream",
        "Content-Disposition": `${disposition}; filename*=UTF-8''${filename}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/documents/[id]", err);
    return NextResponse.json({ error: "Erreur lors de la lecture du document." }, { status: 500 });
  }
}

// Met à jour les métadonnées d'un document (BF-09).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<UpdateDocumentInput>;
    if (!body.nom || !body.type || !body.projetId) {
      return NextResponse.json({ error: "Nom, type et projet sont requis." }, { status: 400 });
    }
    const document = await updateDocument(id, {
      nom: body.nom,
      type: body.type,
      projetId: body.projetId,
    });
    if (!document) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (err) {
    console.error("PATCH /api/documents/[id]", err);
    return NextResponse.json({ error: "Erreur lors de la modification du document." }, { status: 500 });
  }
}

// Supprime un document (BF-09).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supprime = await deleteDocument(id);
    if (!supprime) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/documents/[id]", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du document." }, { status: 500 });
  }
}
