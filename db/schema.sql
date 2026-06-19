-- Schéma de la base TREKKA (PostgreSQL / Neon).
-- Aligné sur la couche d'accès aux données src/lib/queries.ts.
-- Exécutable tel quel dans la console Neon, ou via POST /api/seed (idempotent).

CREATE TABLE IF NOT EXISTS projets (
  id                   TEXT PRIMARY KEY,
  intitule             TEXT        NOT NULL,
  type                 TEXT        NOT NULL,
  region               TEXT        NOT NULL,
  moa                  TEXT        NOT NULL DEFAULT '',
  lot                  TEXT        NOT NULL DEFAULT '',
  statut               TEXT        NOT NULL DEFAULT 'ontime',
  avancement           INTEGER     NOT NULL DEFAULT 0,
  budget_total         NUMERIC(18,2) NOT NULL DEFAULT 0,
  budget_consomme      NUMERIC(18,2) NOT NULL DEFAULT 0,
  delai_restant_jours  INTEGER     NOT NULL DEFAULT 0,
  lat                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng                  DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- L'identifiant de tâche ("t-1", "t-2"...) n'est unique qu'au sein d'un projet
-- → clé primaire composite (projet_id, id).
CREATE TABLE IF NOT EXISTS taches (
  id           TEXT    NOT NULL,
  projet_id    TEXT    NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  intitule     TEXT    NOT NULL,
  avancement   INTEGER NOT NULL DEFAULT 0,
  statut       TEXT    NOT NULL DEFAULT 'ontime',
  responsable  TEXT    NOT NULL DEFAULT '',
  echeance     DATE,
  PRIMARY KEY (projet_id, id)
);

CREATE TABLE IF NOT EXISTS alertes (
  id         TEXT PRIMARY KEY,
  projet_id  TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  severite   TEXT NOT NULL,
  message    TEXT NOT NULL,
  date       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS utilisateurs (
  id     TEXT PRIMARY KEY,
  nom    TEXT NOT NULL,
  role   TEXT NOT NULL,
  email  TEXT NOT NULL UNIQUE,
  actif  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS documents (
  id         TEXT PRIMARY KEY,
  projet_id  TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  type       TEXT NOT NULL,
  taille     TEXT NOT NULL DEFAULT '',
  date       DATE NOT NULL DEFAULT now(),
  -- Contenu réel du fichier, encodé en base64 (NULL pour les documents de
  -- démonstration n'ayant que des métadonnées). `mime` sert au téléchargement
  -- et à l'aperçu (Content-Type).
  contenu    TEXT,
  mime       TEXT
);

-- Journal d'audit (BF-15 / BNF-09). Trace horodatée des actions ; alimenté
-- automatiquement par la couche d'accès (logEvent dans src/lib/queries.ts).
CREATE TABLE IF NOT EXISTS journal (
  id      TEXT PRIMARY KEY,
  acteur  TEXT NOT NULL,
  action  TEXT NOT NULL,
  cible   TEXT NOT NULL DEFAULT '',
  date    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demandes de contact issues du formulaire de la vitrine publique.
CREATE TABLE IF NOT EXISTS contacts (
  id           TEXT PRIMARY KEY,
  nom          TEXT NOT NULL,
  organisation TEXT,
  email        TEXT NOT NULL,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taches_projet    ON taches (projet_id);
CREATE INDEX IF NOT EXISTS idx_alertes_projet   ON alertes (projet_id);
CREATE INDEX IF NOT EXISTS idx_projets_statut   ON projets (statut);
CREATE INDEX IF NOT EXISTS idx_documents_projet ON documents (projet_id);
CREATE INDEX IF NOT EXISTS idx_journal_date     ON journal (date DESC);
