// Migration TREKKA — validation de clôture des tâches par le maître d'œuvre.
//   npm run db:migrate-validation
//
// Ajoute la colonne `validation` à la table `taches` (idempotent) :
//   'none'        — état normal
//   'en_attente'  — l'ouvrier affecté a déclaré la tâche terminée ; en attente
//                   de la vérification du maître d'œuvre.
// Lorsque le MOE valide, la tâche passe à 100 % / statut 'done' et `validation`
// revient à 'none' ; s'il refuse, seul `validation` revient à 'none'.
//
// Réexécutable sans effet de bord (ADD COLUMN IF NOT EXISTS).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* .env.local absent : on s'appuiera sur l'environnement */
  }
}
loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("✖ DATABASE_URL introuvable (renseignez-la dans .env.local).");
  process.exit(1);
}

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE taches ADD COLUMN IF NOT EXISTS validation TEXT NOT NULL DEFAULT 'none'`;
  console.log("✔ Colonne taches.validation en place (validation de clôture par le maître d'œuvre).");
}

main().catch((err) => {
  console.error("✖ Échec de la migration :", err.message);
  process.exit(1);
});
