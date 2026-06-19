// Migration : ajoute le stockage du contenu réel des fichiers à la table `documents`.
//
// Usage :
//   node scripts/migrate-documents.mjs
//
// Ajoute (de façon idempotente) les colonnes `contenu` (base64) et `mime`.
// Sûr à réexécuter : ADD COLUMN IF NOT EXISTS ne touche pas aux données.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function envValue(name) {
  const raw = readFileSync(join(root, ".env.local"), "utf8");
  const m = raw.match(new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\\n]+)"?`, "m"));
  return m ? m[1].trim() : undefined;
}

const DATABASE_URL = process.env.DATABASE_URL || envValue("DATABASE_URL");
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL introuvable (.env.local).");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function main() {
  console.log("→ Ajout des colonnes contenu / mime à la table documents…");
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS contenu TEXT`;
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime TEXT`;
  console.log("✓ Migration terminée.");
}

main().catch((err) => {
  console.error("✗ Échec de la migration :", err);
  process.exit(1);
});
