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

-- Découpage hiérarchique réalisé par le maître d'œuvre :
--   projet → étapes → activités → tâches.
-- Les identifiants ("e-1", "a-1", "t-1"...) ne sont uniques qu'au sein d'un
-- projet → clés primaires composites (projet_id, id).

CREATE TABLE IF NOT EXISTS etapes (
  id          TEXT    NOT NULL,
  projet_id   TEXT    NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  intitule    TEXT    NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  avancement  INTEGER NOT NULL DEFAULT 0,
  statut      TEXT    NOT NULL DEFAULT 'ontime',
  PRIMARY KEY (projet_id, id)
);

CREATE TABLE IF NOT EXISTS activites (
  id          TEXT    NOT NULL,
  projet_id   TEXT    NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  etape_id    TEXT    NOT NULL,
  intitule    TEXT    NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  avancement  INTEGER NOT NULL DEFAULT 0,
  statut      TEXT    NOT NULL DEFAULT 'ontime',
  PRIMARY KEY (projet_id, id),
  FOREIGN KEY (projet_id, etape_id) REFERENCES etapes(projet_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS taches (
  id           TEXT    NOT NULL,
  projet_id    TEXT    NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  etape_id     TEXT    NOT NULL DEFAULT '',
  activite_id  TEXT    NOT NULL DEFAULT '',
  ordre        INTEGER NOT NULL DEFAULT 0,
  intitule     TEXT    NOT NULL,
  avancement   INTEGER NOT NULL DEFAULT 0,
  statut       TEXT    NOT NULL DEFAULT 'ontime',
  responsable  TEXT    NOT NULL DEFAULT '',
  echeance     DATE,
  PRIMARY KEY (projet_id, id)
);

-- Remarques déposées sur une tâche par le MOA / super-admin (BF).
CREATE TABLE IF NOT EXISTS remarques (
  id         TEXT PRIMARY KEY,
  projet_id  TEXT NOT NULL,
  tache_id   TEXT NOT NULL,
  auteur     TEXT NOT NULL,
  contenu    TEXT NOT NULL,
  date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (projet_id, tache_id) REFERENCES taches(projet_id, id) ON DELETE CASCADE
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

-- Affectation d'une tâche à un ou plusieurs ouvriers (BF — maître d'œuvre).
-- Placée après `utilisateurs` (clé étrangère vers les comptes ouvriers).
CREATE TABLE IF NOT EXISTS tache_ouvriers (
  projet_id   TEXT NOT NULL,
  tache_id    TEXT NOT NULL,
  ouvrier_id  TEXT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  PRIMARY KEY (projet_id, tache_id, ouvrier_id),
  FOREIGN KEY (projet_id, tache_id) REFERENCES taches(projet_id, id) ON DELETE CASCADE
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

CREATE INDEX IF NOT EXISTS idx_etapes_projet    ON etapes (projet_id);
CREATE INDEX IF NOT EXISTS idx_activites_projet  ON activites (projet_id, etape_id);
CREATE INDEX IF NOT EXISTS idx_taches_projet    ON taches (projet_id);
CREATE INDEX IF NOT EXISTS idx_taches_activite  ON taches (projet_id, activite_id);
CREATE INDEX IF NOT EXISTS idx_tache_ouvriers   ON tache_ouvriers (projet_id, tache_id);
CREATE INDEX IF NOT EXISTS idx_remarques_tache  ON remarques (projet_id, tache_id);
CREATE INDEX IF NOT EXISTS idx_alertes_projet   ON alertes (projet_id);
CREATE INDEX IF NOT EXISTS idx_projets_statut   ON projets (statut);
CREATE INDEX IF NOT EXISTS idx_documents_projet ON documents (projet_id);
CREATE INDEX IF NOT EXISTS idx_journal_date     ON journal (date DESC);
