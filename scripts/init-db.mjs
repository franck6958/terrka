// Initialisation de la base TREKKA (Neon / PostgreSQL) — standalone.
//   npm run db:init
// Crée le schéma (idempotent) puis injecte le jeu de démonstration.
// Tout est exécuté dans UNE seule transaction : avec le pooler Neon, les
// requêtes HTTP isolées peuvent tomber sur des backends différents et le DDL
// n'est alors pas visible des INSERT suivants — la transaction garantit une
// connexion unique et la visibilité immédiate des tables créées.
//
// Le hachage des mots de passe reproduit exactement src/lib/auth.ts
// (PBKDF2-HMAC-SHA256, 100 000 itérations, sel 16 o, base64 standard) :
//   format stocké = pbkdf2$<saltB64>$<hashB64>

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// — Chargement minimal de .env.local (sans dépendance) —
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

const DEFAULT_PASSWORD = "trekka2026"; // cf. src/lib/auth.ts & README

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  return `pbkdf2$${salt.toString("base64")}$${hash.toString("base64")}`;
}

// — Jeu de démonstration (aligné sur src/lib/data.ts) —
const projets = [
  { id: "p-001", intitule: "Réhabilitation route Douala–Yaoundé", type: "route", region: "Littoral", moa: "MINTP", lot: "Lot 3", statut: "risk", avancement: 64, budgetTotal: 18_500_000_000, budgetConsomme: 14_430_000_000, delaiRestantJours: 18, lat: 4.0511, lng: 9.7679, taches: [
    { id: "t-1", intitule: "Terrassement section PK0–PK12", avancement: 100, statut: "done", responsable: "Eq. Terrassement", echeance: "2026-03-15" },
    { id: "t-2", intitule: "Couche de fondation", avancement: 80, statut: "risk", responsable: "Eq. Chaussée", echeance: "2026-06-30" },
    { id: "t-3", intitule: "Revêtement bitumineux", avancement: 35, statut: "risk", responsable: "Eq. Chaussée", echeance: "2026-08-20" },
    { id: "t-4", intitule: "Signalisation et glissières", avancement: 0, statut: "ontime", responsable: "Eq. Équipements", echeance: "2026-09-30" },
  ] },
  { id: "p-002", intitule: "Construction pont sur le Wouri", type: "pont", region: "Littoral", moa: "MINTP", lot: "Lot unique", statut: "ontime", avancement: 42, budgetTotal: 9_200_000_000, budgetConsomme: 3_680_000_000, delaiRestantJours: 210, lat: 4.0617, lng: 9.6917, taches: [
    { id: "t-1", intitule: "Fondations profondes (pieux)", avancement: 90, statut: "done", responsable: "Eq. Génie civil", echeance: "2026-04-10" },
    { id: "t-2", intitule: "Piles et culées", avancement: 50, statut: "ontime", responsable: "Eq. Génie civil", echeance: "2026-07-15" },
    { id: "t-3", intitule: "Tablier", avancement: 10, statut: "ontime", responsable: "Eq. Charpente", echeance: "2026-11-30" },
  ] },
  { id: "p-003", intitule: "Barrage hydroélectrique de Bini", type: "barrage", region: "Adamaoua", moa: "MINEE", lot: "Lot 1 — Génie civil", statut: "late", avancement: 28, budgetTotal: 47_000_000_000, budgetConsomme: 21_150_000_000, delaiRestantJours: -12, lat: 7.3256, lng: 13.5847, taches: [
    { id: "t-1", intitule: "Dérivation provisoire", avancement: 100, statut: "done", responsable: "Eq. Hydraulique", echeance: "2026-02-01" },
    { id: "t-2", intitule: "Excavation fondation barrage", avancement: 45, statut: "late", responsable: "Eq. Terrassement", echeance: "2026-05-01" },
    { id: "t-3", intitule: "Bétonnage corps du barrage", avancement: 5, statut: "late", responsable: "Eq. Génie civil", echeance: "2026-10-01" },
  ] },
  { id: "p-004", intitule: "Lycée technique de Bafoussam", type: "scolaire", region: "Ouest", moa: "MINHDU", lot: "Lot 2 — Bâtiment", statut: "ontime", avancement: 76, budgetTotal: 2_400_000_000, budgetConsomme: 1_700_000_000, delaiRestantJours: 54, lat: 5.4769, lng: 10.4176, taches: [
    { id: "t-1", intitule: "Gros œuvre", avancement: 100, statut: "done", responsable: "Eq. Bâtiment", echeance: "2026-03-01" },
    { id: "t-2", intitule: "Second œuvre", avancement: 70, statut: "ontime", responsable: "Eq. Finitions", echeance: "2026-07-01" },
    { id: "t-3", intitule: "VRD et aménagements", avancement: 40, statut: "ontime", responsable: "Eq. VRD", echeance: "2026-08-10" },
  ] },
  { id: "p-005", intitule: "Adduction d'eau potable de Garoua", type: "hydraulique", region: "Nord", moa: "MINEE", lot: "Lot 1", statut: "paused", avancement: 33, budgetTotal: 6_800_000_000, budgetConsomme: 2_240_000_000, delaiRestantJours: 95, lat: 9.3265, lng: 13.3958, taches: [
    { id: "t-1", intitule: "Station de pompage", avancement: 60, statut: "paused", responsable: "Eq. Hydraulique", echeance: "2026-06-15" },
    { id: "t-2", intitule: "Réseau de distribution", avancement: 20, statut: "paused", responsable: "Eq. Réseaux", echeance: "2026-09-15" },
  ] },
  { id: "p-006", intitule: "Centre hospitalier régional de Bertoua", type: "hospitalier", region: "Est", moa: "MINSANTE", lot: "Lot 3 — Équipements", statut: "risk", avancement: 58, budgetTotal: 12_100_000_000, budgetConsomme: 9_075_000_000, delaiRestantJours: 30, lat: 4.5774, lng: 13.6846, taches: [
    { id: "t-1", intitule: "Bloc opératoire — gros œuvre", avancement: 95, statut: "done", responsable: "Eq. Bâtiment", echeance: "2026-04-20" },
    { id: "t-2", intitule: "Fluides médicaux", avancement: 45, statut: "risk", responsable: "Eq. Technique", echeance: "2026-07-10" },
    { id: "t-3", intitule: "Équipement et mobilier", avancement: 20, statut: "risk", responsable: "Eq. Équipements", echeance: "2026-08-05" },
  ] },
];

const alertes = [
  { id: "a-1", projetId: "p-003", type: "retard", severite: "late", message: "Échéance « Excavation fondation barrage » dépassée de 12 jours.", date: "2026-06-16T08:12:00" },
  { id: "a-2", projetId: "p-001", type: "budget", severite: "risk", message: "Budget consommé à 78 % pour un avancement de 64 %.", date: "2026-06-16T10:40:00" },
  { id: "a-3", projetId: "p-006", type: "budget", severite: "risk", message: "Budget consommé à 75 % — vigilance sur le lot Équipements.", date: "2026-06-15T16:05:00" },
  { id: "a-4", projetId: "p-003", type: "incident", severite: "late", message: "Incident chantier signalé : panne d'engin de terrassement.", date: "2026-06-14T13:22:00" },
  { id: "a-5", projetId: "p-001", type: "retard", severite: "risk", message: "Tâche « Revêtement bitumineux » en retard léger sur le planning.", date: "2026-06-13T09:00:00" },
];

const utilisateurs = [
  { id: "u-1", nom: "Breanna Nguekeng", role: "super-admin", email: "admin@trekka.cm", actif: true },
  { id: "u-2", nom: "Direction MINTP", role: "moa", email: "moa@mintp.cm", actif: true },
  { id: "u-3", nom: "Ing. Paul Mbarga", role: "moe", email: "p.mbarga@trekka.cm", actif: true },
  { id: "u-4", nom: "Jean Eto'o", role: "chef-chantier", email: "j.etoo@trekka.cm", actif: true },
  { id: "u-5", nom: "Bureau Veritas CM", role: "controle", email: "controle@trekka.cm", actif: true },
  { id: "u-6", nom: "Banque Mondiale", role: "bailleur", email: "suivi@bailleur.org", actif: true },
  { id: "u-7", nom: "Ali Bakari", role: "ouvrier", email: "a.bakari@trekka.cm", actif: false },
];

const documents = [
  { id: "d-1", projetId: "p-001", nom: "Ordre de service n°1 — Lot 3.pdf", type: "os", date: "2026-01-12", taille: "1,2 Mo" },
  { id: "d-2", projetId: "p-001", nom: "PV de visite — mai 2026.pdf", type: "pv", date: "2026-05-28", taille: "640 Ko" },
  { id: "d-3", projetId: "p-002", nom: "Plan d'exécution tablier.dwg", type: "plan", date: "2026-04-03", taille: "8,5 Mo" },
  { id: "d-4", projetId: "p-003", nom: "Photo coulage béton.jpg", type: "photo", date: "2026-06-10", taille: "3,1 Mo" },
  { id: "d-5", projetId: "p-004", nom: "Rapport mensuel — Bafoussam.pdf", type: "rapport", date: "2026-06-01", taille: "920 Ko" },
  { id: "d-6", projetId: "p-006", nom: "PV de réception partielle.pdf", type: "pv", date: "2026-05-20", taille: "510 Ko" },
];

const journal = [
  { id: "j-1", acteur: "Ing. Paul Mbarga", action: "a validé le rapport", cible: "Réhabilitation route Douala–Yaoundé", date: "2026-06-16T11:42:00" },
  { id: "j-2", acteur: "Jean Eto'o", action: "a mis à jour l'avancement de la tâche", cible: "Couche de fondation → 80%", date: "2026-06-16T09:15:00" },
  { id: "j-3", acteur: "Système", action: "a généré une alerte de retard", cible: "Barrage hydroélectrique de Bini", date: "2026-06-16T08:12:00" },
  { id: "j-4", acteur: "Bureau Veritas CM", action: "a consigné une observation de visite", cible: "Centre hospitalier de Bertoua", date: "2026-06-15T16:30:00" },
  { id: "j-5", acteur: "Direction MINTP", action: "a mis le projet en pause", cible: "Adduction d'eau potable de Garoua", date: "2026-06-14T14:05:00" },
  { id: "j-6", acteur: "Breanna Nguekeng", action: "a créé le compte utilisateur", cible: "Ali Bakari (Ouvrier)", date: "2026-06-13T10:00:00" },
];

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const motDePasseHash = hashPassword(DEFAULT_PASSWORD);

  // On accumule toutes les requêtes (DDL + DML) puis on les exécute dans une
  // seule transaction → connexion unique, DDL visible des INSERT suivants.
  const q = [];

  // — Schéma (idempotent) —
  q.push(sql`CREATE TABLE IF NOT EXISTS projets (
    id TEXT PRIMARY KEY, intitule TEXT NOT NULL, type TEXT NOT NULL, region TEXT NOT NULL,
    moa TEXT NOT NULL DEFAULT '', lot TEXT NOT NULL DEFAULT '', statut TEXT NOT NULL DEFAULT 'ontime',
    avancement INTEGER NOT NULL DEFAULT 0, budget_total NUMERIC(18,2) NOT NULL DEFAULT 0,
    budget_consomme NUMERIC(18,2) NOT NULL DEFAULT 0, delai_restant_jours INTEGER NOT NULL DEFAULT 0,
    lat DOUBLE PRECISION NOT NULL DEFAULT 0, lng DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  q.push(sql`CREATE TABLE IF NOT EXISTS etapes (
    id TEXT NOT NULL, projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
    intitule TEXT NOT NULL, ordre INTEGER NOT NULL DEFAULT 0,
    avancement INTEGER NOT NULL DEFAULT 0, statut TEXT NOT NULL DEFAULT 'ontime',
    PRIMARY KEY (projet_id, id))`);
  q.push(sql`CREATE TABLE IF NOT EXISTS activites (
    id TEXT NOT NULL, projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
    etape_id TEXT NOT NULL, intitule TEXT NOT NULL, ordre INTEGER NOT NULL DEFAULT 0,
    avancement INTEGER NOT NULL DEFAULT 0, statut TEXT NOT NULL DEFAULT 'ontime',
    PRIMARY KEY (projet_id, id),
    FOREIGN KEY (projet_id, etape_id) REFERENCES etapes(projet_id, id) ON DELETE CASCADE)`);
  q.push(sql`CREATE TABLE IF NOT EXISTS taches (
    id TEXT NOT NULL, projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
    etape_id TEXT NOT NULL DEFAULT '', activite_id TEXT NOT NULL DEFAULT '', ordre INTEGER NOT NULL DEFAULT 0,
    intitule TEXT NOT NULL, avancement INTEGER NOT NULL DEFAULT 0, statut TEXT NOT NULL DEFAULT 'ontime',
    responsable TEXT NOT NULL DEFAULT '', echeance DATE, PRIMARY KEY (projet_id, id))`);
  q.push(sql`ALTER TABLE taches ADD COLUMN IF NOT EXISTS etape_id TEXT NOT NULL DEFAULT ''`);
  q.push(sql`ALTER TABLE taches ADD COLUMN IF NOT EXISTS activite_id TEXT NOT NULL DEFAULT ''`);
  q.push(sql`ALTER TABLE taches ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0`);
  q.push(sql`CREATE TABLE IF NOT EXISTS remarques (
    id TEXT PRIMARY KEY, projet_id TEXT NOT NULL, tache_id TEXT NOT NULL,
    auteur TEXT NOT NULL, contenu TEXT NOT NULL, date TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (projet_id, tache_id) REFERENCES taches(projet_id, id) ON DELETE CASCADE)`);
  q.push(sql`CREATE TABLE IF NOT EXISTS alertes (
    id TEXT PRIMARY KEY, projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
    type TEXT NOT NULL, severite TEXT NOT NULL, message TEXT NOT NULL, date TIMESTAMPTZ NOT NULL DEFAULT now())`);
  q.push(sql`CREATE TABLE IF NOT EXISTS utilisateurs (
    id TEXT PRIMARY KEY, nom TEXT NOT NULL, role TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    actif BOOLEAN NOT NULL DEFAULT true, mot_de_passe_hash TEXT NOT NULL DEFAULT '')`);
  q.push(sql`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mot_de_passe_hash TEXT NOT NULL DEFAULT ''`);
  q.push(sql`CREATE TABLE IF NOT EXISTS tache_ouvriers (
    projet_id TEXT NOT NULL, tache_id TEXT NOT NULL,
    ouvrier_id TEXT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    PRIMARY KEY (projet_id, tache_id, ouvrier_id),
    FOREIGN KEY (projet_id, tache_id) REFERENCES taches(projet_id, id) ON DELETE CASCADE)`);
  q.push(sql`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
    nom TEXT NOT NULL, type TEXT NOT NULL, taille TEXT NOT NULL DEFAULT '', date DATE NOT NULL DEFAULT now(),
    contenu TEXT, mime TEXT)`);
  q.push(sql`CREATE TABLE IF NOT EXISTS journal (
    id TEXT PRIMARY KEY, acteur TEXT NOT NULL, action TEXT NOT NULL, cible TEXT NOT NULL DEFAULT '',
    date TIMESTAMPTZ NOT NULL DEFAULT now())`);
  q.push(sql`CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY, nom TEXT NOT NULL, organisation TEXT, email TEXT NOT NULL,
    message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);

  // — Données de démonstration (réexécutable sans doublon) —
  for (const p of projets) {
    q.push(sql`INSERT INTO projets (id, intitule, type, region, moa, lot, statut, avancement, budget_total, budget_consomme, delai_restant_jours, lat, lng)
      VALUES (${p.id}, ${p.intitule}, ${p.type}, ${p.region}, ${p.moa}, ${p.lot}, ${p.statut}, ${p.avancement}, ${p.budgetTotal}, ${p.budgetConsomme}, ${p.delaiRestantJours}, ${p.lat}, ${p.lng})
      ON CONFLICT (id) DO NOTHING`);
    // Les tâches de démonstration sont regroupées dans une étape + activité par
    // défaut (le maître d'œuvre affinera ensuite le découpage).
    q.push(sql`INSERT INTO etapes (id, projet_id, intitule, ordre, avancement, statut)
      VALUES ('e-1', ${p.id}, ${"Étape 1 — Réalisation"}, 1, ${p.avancement}, ${p.statut})
      ON CONFLICT (projet_id, id) DO NOTHING`);
    q.push(sql`INSERT INTO activites (id, projet_id, etape_id, intitule, ordre, avancement, statut)
      VALUES ('a-1', ${p.id}, 'e-1', ${"Activité 1 — Travaux"}, 1, ${p.avancement}, ${p.statut})
      ON CONFLICT (projet_id, id) DO NOTHING`);
    p.taches.forEach((t, i) => {
      q.push(sql`INSERT INTO taches (id, projet_id, etape_id, activite_id, ordre, intitule, avancement, statut, responsable, echeance)
        VALUES (${t.id}, ${p.id}, 'e-1', 'a-1', ${i + 1}, ${t.intitule}, ${t.avancement}, ${t.statut}, ${t.responsable}, ${t.echeance})
        ON CONFLICT (projet_id, id) DO NOTHING`);
    });
  }
  for (const a of alertes) {
    q.push(sql`INSERT INTO alertes (id, projet_id, type, severite, message, date)
      VALUES (${a.id}, ${a.projetId}, ${a.type}, ${a.severite}, ${a.message}, ${a.date})
      ON CONFLICT (id) DO NOTHING`);
  }
  // Tous les comptes de démo partagent le même mot de passe (cf. README).
  for (const u of utilisateurs) {
    q.push(sql`INSERT INTO utilisateurs (id, nom, role, email, actif, mot_de_passe_hash)
      VALUES (${u.id}, ${u.nom}, ${u.role}, ${u.email}, ${u.actif}, ${motDePasseHash})
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, mot_de_passe_hash = EXCLUDED.mot_de_passe_hash`);
  }
  for (const d of documents) {
    q.push(sql`INSERT INTO documents (id, projet_id, nom, type, taille, date)
      VALUES (${d.id}, ${d.projetId}, ${d.nom}, ${d.type}, ${d.taille}, ${d.date})
      ON CONFLICT (id) DO NOTHING`);
  }
  for (const j of journal) {
    q.push(sql`INSERT INTO journal (id, acteur, action, cible, date)
      VALUES (${j.id}, ${j.acteur}, ${j.action}, ${j.cible}, ${j.date})
      ON CONFLICT (id) DO NOTHING`);
  }

  await sql.transaction(q);

  console.log("✔ Base TREKKA initialisée.");
  console.log(`  projets: ${projets.length} · alertes: ${alertes.length} · utilisateurs: ${utilisateurs.length} · documents: ${documents.length} · journal: ${journal.length}`);
  console.log(`  Super-admin : admin@trekka.cm  ·  mot de passe : ${DEFAULT_PASSWORD}`);
}

main().catch((err) => {
  console.error("✖ Échec de l'initialisation :", err.message);
  process.exit(1);
});
