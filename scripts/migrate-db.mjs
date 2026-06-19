// Migration des données TREKKA d'une base Neon vers une autre (ex. changement de région).
//
// Usage :
//   node scripts/migrate-db.mjs "<NOUVELLE_DATABASE_URL>"
//
// - Source  = DATABASE_URL lue dans .env.local (la base actuelle).
// - Cible   = argument passé en ligne de commande (la nouvelle base/région).
//
// Le script applique le schéma (db/schema.sql) sur la cible, puis copie toutes
// les lignes table par table (ON CONFLICT DO NOTHING → réexécutable sans doublon).
// Les données existantes de la source ne sont jamais modifiées.

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

const SOURCE_URL = process.env.SOURCE_DATABASE_URL || envValue("DATABASE_URL");
const TARGET_URL = process.argv[2] || process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL) {
  console.error("✗ Source introuvable : renseignez DATABASE_URL dans .env.local.");
  process.exit(1);
}
if (!TARGET_URL) {
  console.error('✗ Cible manquante : node scripts/migrate-db.mjs "<NOUVELLE_DATABASE_URL>"');
  process.exit(1);
}
if (SOURCE_URL === TARGET_URL) {
  console.error("✗ Source et cible identiques — rien à migrer.");
  process.exit(1);
}

const source = neon(SOURCE_URL);
const target = neon(TARGET_URL);

// Ordre respectant les clés étrangères (parents avant enfants).
const TABLES = ["utilisateurs", "projets", "taches", "alertes", "documents", "journal", "contacts"];

// Petit utilitaire de réessai (la liaison Neon peut être intermittente).
async function withRetry(label, fn, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === attempts) throw e;
      console.log(`  …${label} : tentative ${i} échouée (${String(e.message).slice(0, 40)}), nouvelle tentative`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

async function main() {
  console.log("→ Application du schéma sur la nouvelle base…");
  const schema = readFileSync(join(root, "db", "schema.sql"), "utf8");
  // On découpe en instructions et on exécute dans une transaction unique.
  const statements = schema
    .split(/;\s*\n/)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter((s) => s.length > 0);
  await withRetry("schéma", () => target.transaction(statements.map((s) => target.query(s))));

  let totalCopie = 0;
  for (const table of TABLES) {
    let rows;
    try {
      rows = await withRetry(`lecture ${table}`, () => source.query(`SELECT * FROM ${table}`));
    } catch (e) {
      console.log(`→ ${table} : ignorée (absente de la source ?) — ${String(e.message).slice(0, 50)}`);
      continue;
    }
    if (rows.length === 0) {
      console.log(`→ ${table} : 0 ligne`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    let copied = 0;
    for (const row of rows) {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const values = cols.map((c) => row[c]);
      await withRetry(`insert ${table}`, () =>
        target.query(
          `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        )
      );
      copied++;
    }
    totalCopie += copied;
    console.log(`→ ${table} : ${copied} ligne(s) copiée(s)`);
  }

  // Vérification : comptage côté cible.
  console.log("\n→ Vérification (nouvelle base) :");
  for (const table of TABLES) {
    try {
      const [r] = await target.query(`SELECT count(*)::int AS c FROM ${table}`);
      console.log(`   ${table.padEnd(14)} ${r.c}`);
    } catch {
      /* table absente */
    }
  }
  console.log(`\n✓ Migration terminée — ${totalCopie} ligne(s) au total.`);
}

main().catch((err) => {
  console.error("✗ Échec de la migration :", err);
  process.exit(1);
});
