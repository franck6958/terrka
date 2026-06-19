import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { projets, alertes, utilisateurs, documents, journal } from "@/lib/data";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Initialise la base TREKKA : crée le schéma (idempotent) puis injecte le
// jeu de démonstration depuis src/lib/data.ts.
// À appeler une fois après provisionnement de la base : POST /api/seed
// Les INSERT utilisent ON CONFLICT DO NOTHING → réexécutable sans doublon.
export async function POST() {
  try {
    // — Schéma —
    await sql`
      CREATE TABLE IF NOT EXISTS projets (
        id TEXT PRIMARY KEY,
        intitule TEXT NOT NULL,
        type TEXT NOT NULL,
        region TEXT NOT NULL,
        moa TEXT NOT NULL DEFAULT '',
        lot TEXT NOT NULL DEFAULT '',
        statut TEXT NOT NULL DEFAULT 'ontime',
        avancement INTEGER NOT NULL DEFAULT 0,
        budget_total NUMERIC(18,2) NOT NULL DEFAULT 0,
        budget_consomme NUMERIC(18,2) NOT NULL DEFAULT 0,
        delai_restant_jours INTEGER NOT NULL DEFAULT 0,
        lat DOUBLE PRECISION NOT NULL DEFAULT 0,
        lng DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS taches (
        id TEXT NOT NULL,
        projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
        intitule TEXT NOT NULL,
        avancement INTEGER NOT NULL DEFAULT 0,
        statut TEXT NOT NULL DEFAULT 'ontime',
        responsable TEXT NOT NULL DEFAULT '',
        echeance DATE,
        PRIMARY KEY (projet_id, id)
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS alertes (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        severite TEXT NOT NULL,
        message TEXT NOT NULL,
        date TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        actif BOOLEAN NOT NULL DEFAULT true,
        mot_de_passe_hash TEXT NOT NULL DEFAULT ''
      )`;
    // Colonne mot de passe pour les bases déjà créées avant l'auth (BF-01).
    await sql`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mot_de_passe_hash TEXT NOT NULL DEFAULT ''`;
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
        nom TEXT NOT NULL,
        type TEXT NOT NULL,
        taille TEXT NOT NULL DEFAULT '',
        date DATE NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS journal (
        id TEXT PRIMARY KEY,
        acteur TEXT NOT NULL,
        action TEXT NOT NULL,
        cible TEXT NOT NULL DEFAULT '',
        date TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        organisation TEXT,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;

    // — Données de démonstration —
    for (const p of projets) {
      await sql`
        INSERT INTO projets (id, intitule, type, region, moa, lot, statut, avancement, budget_total, budget_consomme, delai_restant_jours, lat, lng)
        VALUES (${p.id}, ${p.intitule}, ${p.type}, ${p.region}, ${p.moa}, ${p.lot}, ${p.statut}, ${p.avancement}, ${p.budgetTotal}, ${p.budgetConsomme}, ${p.delaiRestantJours}, ${p.lat}, ${p.lng})
        ON CONFLICT (id) DO NOTHING`;
      for (const t of p.taches) {
        await sql`
          INSERT INTO taches (id, projet_id, intitule, avancement, statut, responsable, echeance)
          VALUES (${t.id}, ${p.id}, ${t.intitule}, ${t.avancement}, ${t.statut}, ${t.responsable}, ${t.echeance})
          ON CONFLICT (projet_id, id) DO NOTHING`;
      }
    }

    for (const a of alertes) {
      await sql`
        INSERT INTO alertes (id, projet_id, type, severite, message, date)
        VALUES (${a.id}, ${a.projetId}, ${a.type}, ${a.severite}, ${a.message}, ${a.date})
        ON CONFLICT (id) DO NOTHING`;
    }

    // Tous les comptes de démo partagent le même mot de passe (cf. README).
    const motDePasseHash = await hashPassword(DEFAULT_PASSWORD);
    for (const u of utilisateurs) {
      await sql`
        INSERT INTO utilisateurs (id, nom, role, email, actif, mot_de_passe_hash)
        VALUES (${u.id}, ${u.nom}, ${u.role}, ${u.email}, ${u.actif}, ${motDePasseHash})
        ON CONFLICT (id) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash`;
    }

    for (const d of documents) {
      await sql`
        INSERT INTO documents (id, projet_id, nom, type, taille, date)
        VALUES (${d.id}, ${d.projetId}, ${d.nom}, ${d.type}, ${d.taille}, ${d.date})
        ON CONFLICT (id) DO NOTHING`;
    }

    for (const j of journal) {
      await sql`
        INSERT INTO journal (id, acteur, action, cible, date)
        VALUES (${j.id}, ${j.acteur}, ${j.action}, ${j.cible}, ${j.date})
        ON CONFLICT (id) DO NOTHING`;
    }

    return NextResponse.json({
      ok: true,
      message: "Base initialisée.",
      projets: projets.length,
      alertes: alertes.length,
      utilisateurs: utilisateurs.length,
      documents: documents.length,
      journal: journal.length,
    });
  } catch (err) {
    console.error("POST /api/seed", err);
    return NextResponse.json({ error: "Échec de l'initialisation de la base." }, { status: 500 });
  }
}
