// Migration TREKKA — introduction du découpage hiérarchique :
//   projet → étapes → activités → tâches.
//   npm run db:migrate-hierarchie
//
// 1) Crée les tables etapes, activites, tache_ouvriers, remarques (idempotent)
//    et ajoute les colonnes etape_id / activite_id / ordre à la table taches.
// 2) Pour chaque projet dont les tâches ne sont rattachées à aucune activité,
//    crée une étape « Étape 1 » + une activité « Activité 1 » par défaut et y
//    rattache toutes les tâches existantes (en conservant leur ordre par id).
//
// Réexécutable sans effet de bord : les projets déjà migrés sont ignorés.

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

  // — 1) Schéma (idempotent) —
  const ddl = [
    sql`CREATE TABLE IF NOT EXISTS etapes (
      id TEXT NOT NULL, projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
      intitule TEXT NOT NULL, ordre INTEGER NOT NULL DEFAULT 0,
      avancement INTEGER NOT NULL DEFAULT 0, statut TEXT NOT NULL DEFAULT 'ontime',
      PRIMARY KEY (projet_id, id))`,
    sql`CREATE TABLE IF NOT EXISTS activites (
      id TEXT NOT NULL, projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
      etape_id TEXT NOT NULL, intitule TEXT NOT NULL, ordre INTEGER NOT NULL DEFAULT 0,
      avancement INTEGER NOT NULL DEFAULT 0, statut TEXT NOT NULL DEFAULT 'ontime',
      PRIMARY KEY (projet_id, id),
      FOREIGN KEY (projet_id, etape_id) REFERENCES etapes(projet_id, id) ON DELETE CASCADE)`,
    sql`ALTER TABLE taches ADD COLUMN IF NOT EXISTS etape_id TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE taches ADD COLUMN IF NOT EXISTS activite_id TEXT NOT NULL DEFAULT ''`,
    sql`ALTER TABLE taches ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0`,
    sql`CREATE TABLE IF NOT EXISTS tache_ouvriers (
      projet_id TEXT NOT NULL, tache_id TEXT NOT NULL,
      ouvrier_id TEXT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
      PRIMARY KEY (projet_id, tache_id, ouvrier_id),
      FOREIGN KEY (projet_id, tache_id) REFERENCES taches(projet_id, id) ON DELETE CASCADE)`,
    sql`CREATE TABLE IF NOT EXISTS remarques (
      id TEXT PRIMARY KEY, projet_id TEXT NOT NULL, tache_id TEXT NOT NULL,
      auteur TEXT NOT NULL, contenu TEXT NOT NULL, date TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (projet_id, tache_id) REFERENCES taches(projet_id, id) ON DELETE CASCADE)`,
    sql`CREATE INDEX IF NOT EXISTS idx_etapes_projet ON etapes (projet_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_activites_projet ON activites (projet_id, etape_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_taches_activite ON taches (projet_id, activite_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_tache_ouvriers ON tache_ouvriers (projet_id, tache_id)`,
    sql`CREATE INDEX IF NOT EXISTS idx_remarques_tache ON remarques (projet_id, tache_id)`,
  ];
  await sql.transaction(ddl);
  console.log("✔ Schéma hiérarchique en place (etapes, activites, tache_ouvriers, remarques).");

  // — 2) Rattachement des tâches orphelines (sans activité) —
  const projets = await sql`SELECT id, statut FROM projets ORDER BY id`;
  let migres = 0;
  for (const p of projets) {
    const orphelines = await sql`
      SELECT id FROM taches
      WHERE projet_id = ${p.id} AND (activite_id IS NULL OR activite_id = '')
      ORDER BY id`;
    if (orphelines.length === 0) continue;

    const etapeId = "e-1";
    const activiteId = "a-1";
    const batch = [
      sql`INSERT INTO etapes (id, projet_id, intitule, ordre, avancement, statut)
        VALUES (${etapeId}, ${p.id}, ${"Étape 1"}, 1, 0, ${p.statut})
        ON CONFLICT (projet_id, id) DO NOTHING`,
      sql`INSERT INTO activites (id, projet_id, etape_id, intitule, ordre, avancement, statut)
        VALUES (${activiteId}, ${p.id}, ${etapeId}, ${"Activité 1"}, 1, 0, ${p.statut})
        ON CONFLICT (projet_id, id) DO NOTHING`,
    ];
    orphelines.forEach((t, i) => {
      batch.push(sql`
        UPDATE taches SET etape_id = ${etapeId}, activite_id = ${activiteId}, ordre = ${i + 1}
        WHERE projet_id = ${p.id} AND id = ${t.id}`);
    });
    await sql.transaction(batch);
    migres++;
    console.log(`→ ${p.id} : ${orphelines.length} tâche(s) rattachée(s) à Étape 1 / Activité 1`);
  }

  console.log(`\n✓ Migration terminée — ${migres} projet(s) restructuré(s).`);
}

main().catch((err) => {
  console.error("✖ Échec de la migration :", err.message);
  process.exit(1);
});
