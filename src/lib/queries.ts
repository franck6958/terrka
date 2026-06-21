import "server-only";
import { sql } from "./db";
import { getActeurNom } from "./auth";
import type { Projet, Etape, Activite, Tache, OuvrierRef, Remarque, Alerte, Utilisateur, Document, EntreeJournal, StatusKey, Role, DocumentType } from "./types";

// Couche d'accès aux données TREKKA — traduit les lignes Postgres
// vers les types métier (cf. types.ts). Toutes ces fonctions s'exécutent
// côté serveur uniquement.

// Convertit une valeur DATE/timestamp Postgres en chaîne ISO « yyyy-mm-dd ».
function dateOnly(v: unknown): string {
  if (v == null) return "";
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
}

// — Progression & verrouillage (cahier des charges) —
//
// L'avancement et l'état des activités et des étapes sont calculés
// automatiquement par le système à partir de l'avancement des tâches :
//   activité.avancement = moyenne des tâches ; étape.avancement = moyenne des activités.
// Une activité (resp. une étape) est « terminée » lorsque toutes ses tâches
// (resp. activités) sont à 100 %. Le verrouillage séquentiel interdit de
// progresser sur une activité tant que la précédente n'est pas terminée, et
// sur une étape tant que la précédente n'est pas terminée.

// État agrégé d'un niveau à partir de ses enfants (sans tenir compte du verrou).
function statutAgrege(children: { statut: StatusKey }[], complete: boolean): StatusKey {
  if (complete) return "done";
  if (children.some((c) => c.statut === "late")) return "late";
  if (children.some((c) => c.statut === "risk")) return "risk";
  if (children.length > 0 && children.every((c) => c.statut === "paused")) return "paused";
  return "ontime";
}

function moyenne(values: number[]): number {
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
}

function rowToTache(
  r: Record<string, unknown>,
  ouvriers: OuvrierRef[],
  remarques: Remarque[]
): Tache {
  return {
    id: r.id as string,
    etapeId: (r.etape_id as string) ?? "",
    activiteId: (r.activite_id as string) ?? "",
    ordre: Number(r.ordre ?? 0),
    intitule: r.intitule as string,
    avancement: Number(r.avancement),
    statut: r.statut as StatusKey,
    responsable: r.responsable as string,
    echeance: dateOnly(r.echeance),
    ouvriers,
    remarques,
  };
}

// Assemble un projet complet (étapes → activités → tâches) à partir des lignes
// brutes, en calculant avancement, état et verrou de chaque niveau.
function buildProjet(
  p: Record<string, unknown>,
  etapeRows: Record<string, unknown>[],
  activiteRows: Record<string, unknown>[],
  tacheRows: Record<string, unknown>[],
  ouvriersByTache: Map<string, OuvrierRef[]>,
  remarquesByTache: Map<string, Remarque[]>
): Projet {
  // Tâches groupées par activité.
  const tachesByActivite = new Map<string, Tache[]>();
  for (const tr of tacheRows) {
    const t = rowToTache(
      tr,
      ouvriersByTache.get(tr.id as string) ?? [],
      remarquesByTache.get(tr.id as string) ?? []
    );
    const key = t.activiteId;
    if (!tachesByActivite.has(key)) tachesByActivite.set(key, []);
    tachesByActivite.get(key)!.push(t);
  }
  for (const list of tachesByActivite.values()) list.sort((a, b) => a.ordre - b.ordre || a.id.localeCompare(b.id));

  // Activités assemblées, groupées par étape.
  const activitesByEtape = new Map<string, Activite[]>();
  for (const ar of activiteRows) {
    const taches = tachesByActivite.get(ar.id as string) ?? [];
    const complete = taches.length > 0 && taches.every((t) => t.avancement >= 100);
    const activite: Activite = {
      id: ar.id as string,
      etapeId: ar.etape_id as string,
      ordre: Number(ar.ordre ?? 0),
      intitule: ar.intitule as string,
      avancement: moyenne(taches.map((t) => t.avancement)),
      statut: statutAgrege(taches, complete),
      verrouillee: false,
      taches,
    };
    const key = activite.etapeId;
    if (!activitesByEtape.has(key)) activitesByEtape.set(key, []);
    activitesByEtape.get(key)!.push(activite);
  }
  for (const list of activitesByEtape.values()) list.sort((a, b) => a.ordre - b.ordre || a.id.localeCompare(b.id));

  // Étapes assemblées et triées.
  const etapes: Etape[] = etapeRows
    .map((er): Etape => {
      const activites = activitesByEtape.get(er.id as string) ?? [];
      const complete = activites.length > 0 && activites.every((a) => a.statut === "done");
      return {
        id: er.id as string,
        ordre: Number(er.ordre ?? 0),
        intitule: er.intitule as string,
        avancement: moyenne(activites.map((a) => a.avancement)),
        statut: statutAgrege(activites, complete),
        verrouillee: false,
        activites,
      };
    })
    .sort((a, b) => a.ordre - b.ordre || a.id.localeCompare(b.id));

  // Verrouillage séquentiel : une étape se déverrouille quand la précédente est
  // terminée ; au sein d'une étape déverrouillée, une activité se déverrouille
  // quand la précédente est terminée.
  let etapesPrecedentesDone = true;
  for (const e of etapes) {
    e.verrouillee = !etapesPrecedentesDone;
    let activitesPrecedentesDone = true;
    for (const a of e.activites) {
      a.verrouillee = e.verrouillee || !activitesPrecedentesDone;
      activitesPrecedentesDone = activitesPrecedentesDone && a.statut === "done";
    }
    etapesPrecedentesDone = etapesPrecedentesDone && e.statut === "done";
  }

  // Liste à plat (vues transverses : tableau de bord, alertes, rapports).
  const taches = etapes.flatMap((e) => e.activites.flatMap((a) => a.taches));

  return recompute({
    id: p.id as string,
    intitule: p.intitule as string,
    type: p.type as Projet["type"],
    region: p.region as string,
    moa: p.moa as string,
    lot: p.lot as string,
    statut: p.statut as StatusKey,
    avancement: Number(p.avancement),
    budgetTotal: Number(p.budget_total),
    budgetConsomme: Number(p.budget_consomme),
    delaiRestantJours: Number(p.delai_restant_jours),
    lat: Number(p.lat),
    lng: Number(p.lng),
    etapes,
    taches,
  });
}

// Indexe les affectations d'ouvriers par (projet, tâche).
function indexOuvriers(rows: Record<string, unknown>[]): Map<string, Map<string, OuvrierRef[]>> {
  const byProjet = new Map<string, Map<string, OuvrierRef[]>>();
  for (const r of rows) {
    const pid = r.projet_id as string;
    const tid = r.tache_id as string;
    if (!byProjet.has(pid)) byProjet.set(pid, new Map());
    const m = byProjet.get(pid)!;
    if (!m.has(tid)) m.set(tid, []);
    m.get(tid)!.push({ id: r.ouvrier_id as string, nom: r.nom as string });
  }
  return byProjet;
}

// Indexe les remarques par (projet, tâche).
function indexRemarques(rows: Record<string, unknown>[]): Map<string, Map<string, Remarque[]>> {
  const byProjet = new Map<string, Map<string, Remarque[]>>();
  for (const r of rows) {
    const pid = r.projet_id as string;
    const tid = r.tache_id as string;
    if (!byProjet.has(pid)) byProjet.set(pid, new Map());
    const m = byProjet.get(pid)!;
    if (!m.has(tid)) m.set(tid, []);
    m.get(tid)!.push({
      id: r.id as string,
      auteur: r.auteur as string,
      contenu: r.contenu as string,
      date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
    });
  }
  return byProjet;
}

export async function getProjets(): Promise<Projet[]> {
  const [projets, etapes, activites, taches, ouvriers, remarques] = (await Promise.all([
    sql`SELECT * FROM projets ORDER BY created_at DESC, id`,
    sql`SELECT * FROM etapes ORDER BY projet_id, ordre, id`,
    sql`SELECT * FROM activites ORDER BY projet_id, ordre, id`,
    sql`SELECT * FROM taches ORDER BY projet_id, ordre, id`,
    sql`SELECT x.projet_id, x.tache_id, x.ouvrier_id, u.nom
        FROM tache_ouvriers x JOIN utilisateurs u ON u.id = x.ouvrier_id`,
    sql`SELECT * FROM remarques ORDER BY date`,
  ])) as Record<string, unknown>[][];

  const group = <T extends { projet_id: unknown }>(rows: Record<string, unknown>[]) => {
    const m = new Map<string, Record<string, unknown>[]>();
    for (const r of rows) {
      const pid = r.projet_id as string;
      if (!m.has(pid)) m.set(pid, []);
      m.get(pid)!.push(r);
    }
    return m;
  };
  const etapesBy = group(etapes);
  const activitesBy = group(activites);
  const tachesBy = group(taches);
  const ouvriersBy = indexOuvriers(ouvriers);
  const remarquesBy = indexRemarques(remarques);

  return projets.map((p) =>
    buildProjet(
      p,
      etapesBy.get(p.id as string) ?? [],
      activitesBy.get(p.id as string) ?? [],
      tachesBy.get(p.id as string) ?? [],
      ouvriersBy.get(p.id as string) ?? new Map(),
      remarquesBy.get(p.id as string) ?? new Map()
    )
  );
}

export async function getProjet(id: string): Promise<Projet | undefined> {
  const projets = (await sql`SELECT * FROM projets WHERE id = ${id}`) as Record<string, unknown>[];
  if (projets.length === 0) return undefined;
  const [etapes, activites, taches, ouvriers, remarques] = (await Promise.all([
    sql`SELECT * FROM etapes WHERE projet_id = ${id} ORDER BY ordre, id`,
    sql`SELECT * FROM activites WHERE projet_id = ${id} ORDER BY ordre, id`,
    sql`SELECT * FROM taches WHERE projet_id = ${id} ORDER BY ordre, id`,
    sql`SELECT x.projet_id, x.tache_id, x.ouvrier_id, u.nom
        FROM tache_ouvriers x JOIN utilisateurs u ON u.id = x.ouvrier_id
        WHERE x.projet_id = ${id}`,
    sql`SELECT * FROM remarques WHERE projet_id = ${id} ORDER BY date`,
  ])) as Record<string, unknown>[][];
  return buildProjet(
    projets[0],
    etapes,
    activites,
    taches,
    indexOuvriers(ouvriers).get(id) ?? new Map(),
    indexRemarques(remarques).get(id) ?? new Map()
  );
}

// Persiste les valeurs dérivées (avancement + état) des étapes, activités et du
// projet après une évolution de tâche, pour garder les colonnes en cohérence.
async function persistDerived(projet: Projet): Promise<void> {
  const batch: ReturnType<typeof sql>[] = [];
  for (const e of projet.etapes) {
    batch.push(sql`UPDATE etapes SET avancement = ${e.avancement}, statut = ${e.statut} WHERE projet_id = ${projet.id} AND id = ${e.id}`);
    for (const a of e.activites) {
      batch.push(sql`UPDATE activites SET avancement = ${a.avancement}, statut = ${a.statut} WHERE projet_id = ${projet.id} AND id = ${a.id}`);
    }
  }
  batch.push(sql`UPDATE projets SET avancement = ${projet.avancement}, statut = ${projet.statut} WHERE id = ${projet.id}`);
  await sql.transaction(batch);
}

export async function getAlertes(): Promise<Alerte[]> {
  const rows = (await sql`SELECT * FROM alertes ORDER BY date DESC`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    projetId: r.projet_id as string,
    type: r.type as Alerte["type"],
    severite: r.severite as Alerte["severite"],
    message: r.message as string,
    date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
  }));
}

function rowToUtilisateur(r: Record<string, unknown>): Utilisateur {
  return {
    id: r.id as string,
    nom: r.nom as string,
    role: r.role as Utilisateur["role"],
    email: r.email as string,
    actif: Boolean(r.actif),
  };
}

export async function getUtilisateurs(): Promise<Utilisateur[]> {
  const rows = (await sql`SELECT * FROM utilisateurs ORDER BY nom`) as Record<string, unknown>[];
  return rows.map(rowToUtilisateur);
}

// Authentification (BF-01) : renvoie l'utilisateur + son hash de mot de passe.
export async function getUtilisateurAuth(
  email: string
): Promise<{ utilisateur: Utilisateur; hash: string } | undefined> {
  const rows = (await sql`SELECT * FROM utilisateurs WHERE email = ${email}`) as Record<string, unknown>[];
  if (rows.length === 0) return undefined;
  return { utilisateur: rowToUtilisateur(rows[0]), hash: (rows[0].mot_de_passe_hash as string) ?? "" };
}

export interface NewUtilisateurInput {
  nom: string;
  email: string;
  role: Role;
}

export async function createUtilisateur(
  input: NewUtilisateurInput,
  motDePasseHash = ""
): Promise<Utilisateur> {
  const id = `u-${Date.now().toString(36)}`;
  const rows = (await sql`
    INSERT INTO utilisateurs (id, nom, role, email, actif, mot_de_passe_hash)
    VALUES (${id}, ${input.nom}, ${input.role}, ${input.email}, true, ${motDePasseHash})
    RETURNING *
  `) as Record<string, unknown>[];
  const utilisateur = rowToUtilisateur(rows[0]);
  await logEvent(await getActeurNom(), "a créé le compte", `${utilisateur.nom} (${utilisateur.role})`);
  return utilisateur;
}

export async function setUtilisateurActif(id: string, actif: boolean): Promise<Utilisateur | undefined> {
  const rows = (await sql`
    UPDATE utilisateurs SET actif = ${actif} WHERE id = ${id} RETURNING *
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const utilisateur = rowToUtilisateur(rows[0]);
  await logEvent(await getActeurNom(), actif ? "a activé le compte" : "a désactivé le compte", utilisateur.nom);
  return utilisateur;
}

// Libellés de rôle pour le journal d'audit (sans dépendance UI).
const ROLE_FR: Record<Role, string> = {
  "super-admin": "Super-administrateur",
  moa: "Maître d'ouvrage",
  moe: "Maître d'œuvre",
  "chef-chantier": "Chef de chantier",
  ouvrier: "Ouvrier",
  controle: "Bureau de contrôle",
  bailleur: "Décideur / Bailleur",
};

// Change le rôle d'un utilisateur (BF-02).
export async function setUtilisateurRole(id: string, role: Role): Promise<Utilisateur | undefined> {
  const rows = (await sql`
    UPDATE utilisateurs SET role = ${role} WHERE id = ${id} RETURNING *
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const utilisateur = rowToUtilisateur(rows[0]);
  await logEvent(await getActeurNom(), "a changé le rôle de l'utilisateur", `${utilisateur.nom} → ${ROLE_FR[role]}`);
  return utilisateur;
}

// Modification d'un compte par un administrateur (nom + e-mail) — BF-02.
// Journalise l'acteur réel (≠ updateUtilisateurProfil qui vise « son » profil).
export async function adminUpdateUtilisateur(
  id: string,
  input: UpdateProfilInput
): Promise<Utilisateur | undefined> {
  const rows = (await sql`
    UPDATE utilisateurs SET nom = ${input.nom}, email = ${input.email}
    WHERE id = ${id} RETURNING *
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const utilisateur = rowToUtilisateur(rows[0]);
  await logEvent(await getActeurNom(), "a modifié le compte", `${utilisateur.nom} (${utilisateur.email})`);
  return utilisateur;
}

// Réinitialisation du mot de passe d'un compte par un administrateur (BF-02).
export async function adminResetMotDePasse(id: string, hash: string): Promise<Utilisateur | undefined> {
  const rows = (await sql`
    UPDATE utilisateurs SET mot_de_passe_hash = ${hash} WHERE id = ${id} RETURNING *
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const utilisateur = rowToUtilisateur(rows[0]);
  await logEvent(await getActeurNom(), "a réinitialisé le mot de passe de", utilisateur.nom);
  return utilisateur;
}

// Supprime un compte utilisateur (BF-02).
export async function deleteUtilisateur(id: string): Promise<boolean> {
  const rows = (await sql`DELETE FROM utilisateurs WHERE id = ${id} RETURNING nom`) as Record<string, unknown>[];
  if (!rows.length) return false;
  await logEvent(await getActeurNom(), "a supprimé le compte utilisateur", rows[0].nom as string);
  return true;
}

// — Profil de l'utilisateur courant (BF-01) —

export interface UpdateProfilInput {
  nom: string;
  email: string;
}

// Met à jour le nom et l'e-mail d'un compte (édition de son propre profil).
export async function updateUtilisateurProfil(
  id: string,
  input: UpdateProfilInput
): Promise<Utilisateur | undefined> {
  const rows = (await sql`
    UPDATE utilisateurs SET nom = ${input.nom}, email = ${input.email}
    WHERE id = ${id} RETURNING *
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const utilisateur = rowToUtilisateur(rows[0]);
  await logEvent(utilisateur.nom, "a mis à jour son profil", utilisateur.email);
  return utilisateur;
}

// Renvoie le hash de mot de passe d'un compte (par id) — pour vérifier le mot
// de passe actuel avant un changement.
export async function getUtilisateurHash(id: string): Promise<string | undefined> {
  const rows = (await sql`SELECT mot_de_passe_hash FROM utilisateurs WHERE id = ${id}`) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  return (rows[0].mot_de_passe_hash as string) ?? "";
}

// Enregistre un nouveau hash de mot de passe.
export async function setMotDePasseHash(id: string, hash: string): Promise<boolean> {
  const rows = (await sql`
    UPDATE utilisateurs SET mot_de_passe_hash = ${hash} WHERE id = ${id} RETURNING nom
  `) as Record<string, unknown>[];
  if (!rows.length) return false;
  await logEvent(rows[0].nom as string, "a changé son mot de passe", "");
  return true;
}

// — Documents (BF-09) —
function rowToDocument(r: Record<string, unknown>): Document {
  // `has_file` est calculé par la requête (contenu IS NOT NULL) ; à défaut on
  // se rabat sur la présence d'un mime (utile si la ligne expose `contenu`).
  const hasFile =
    r.has_file !== undefined ? Boolean(r.has_file) : Boolean(r.mime ?? r.contenu);
  return {
    id: r.id as string,
    projetId: r.projet_id as string,
    nom: r.nom as string,
    type: r.type as DocumentType,
    taille: r.taille as string,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
    mime: (r.mime as string | null) ?? null,
    hasFile,
  };
}

// Formate une taille en octets vers un libellé lisible (« 1,2 Mo »).
export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

export async function getDocuments(): Promise<Document[]> {
  // On exclut volontairement la colonne `contenu` (potentiellement volumineuse)
  // du chargement global ; elle n'est lue qu'au téléchargement / à l'aperçu.
  const rows = (await sql`
    SELECT id, projet_id, nom, type, taille, date, mime, (contenu IS NOT NULL) AS has_file
    FROM documents ORDER BY date DESC, id
  `) as Record<string, unknown>[];
  return rows.map(rowToDocument);
}

// Lit le contenu réel d'un document (base64) pour téléchargement / aperçu.
export async function getDocumentContenu(
  id: string
): Promise<{ nom: string; mime: string | null; contenu: string } | undefined> {
  const rows = (await sql`
    SELECT nom, mime, contenu FROM documents WHERE id = ${id}
  `) as Record<string, unknown>[];
  if (!rows.length || rows[0].contenu == null) return undefined;
  return {
    nom: rows[0].nom as string,
    mime: (rows[0].mime as string | null) ?? null,
    contenu: rows[0].contenu as string,
  };
}

export interface NewDocumentInput {
  projetId: string;
  nom: string;
  type: DocumentType;
  taille: string;
  /** Contenu du fichier encodé en base64 (optionnel : métadonnées seules sinon). */
  contenu?: string | null;
  mime?: string | null;
}

export async function createDocument(input: NewDocumentInput): Promise<Document> {
  const id = `d-${Date.now().toString(36)}`;
  const date = new Date().toISOString().slice(0, 10);
  const rows = (await sql`
    INSERT INTO documents (id, projet_id, nom, type, taille, date, contenu, mime)
    VALUES (${id}, ${input.projetId}, ${input.nom}, ${input.type}, ${input.taille}, ${date}, ${input.contenu ?? null}, ${input.mime ?? null})
    RETURNING id, projet_id, nom, type, taille, date, mime, (contenu IS NOT NULL) AS has_file
  `) as Record<string, unknown>[];
  const document = rowToDocument(rows[0]);
  await logEvent(await getActeurNom(), "a téléversé le document", document.nom);
  return document;
}

export interface UpdateDocumentInput {
  nom: string;
  type: DocumentType;
  projetId: string;
}

// Met à jour les métadonnées d'un document (nom, type, projet rattaché).
export async function updateDocument(
  id: string,
  input: UpdateDocumentInput
): Promise<Document | undefined> {
  const rows = (await sql`
    UPDATE documents
    SET nom = ${input.nom}, type = ${input.type}, projet_id = ${input.projetId}
    WHERE id = ${id}
    RETURNING id, projet_id, nom, type, taille, date, mime, (contenu IS NOT NULL) AS has_file
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  const document = rowToDocument(rows[0]);
  await logEvent(await getActeurNom(), "a modifié le document", document.nom);
  return document;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const rows = (await sql`DELETE FROM documents WHERE id = ${id} RETURNING nom`) as Record<string, unknown>[];
  if (!rows.length) return false;
  await logEvent(await getActeurNom(), "a supprimé le document", rows[0].nom as string);
  return true;
}

export interface NewProjetInput {
  intitule: string;
  type: Projet["type"];
  region: string;
  moa: string;
  lot: string;
  budgetTotal: number;
  delaiRestantJours: number;
  lat: number;
  lng: number;
}

// Recalcule l'avancement global (moyenne des tâches) et l'état du projet.
function recompute(projet: Projet): Projet {
  const taches = projet.taches;
  const avancement = taches.length
    ? Math.round(taches.reduce((s, t) => s + t.avancement, 0) / taches.length)
    : projet.avancement;
  let statut: StatusKey = projet.statut;
  if (statut !== "paused") {
    if (taches.length && taches.every((t) => t.avancement >= 100)) statut = "done";
    else if (projet.delaiRestantJours < 0) statut = "late";
  }
  return { ...projet, avancement, statut };
}

// Crée un projet (réservé au maître d'ouvrage et au super-administrateur — RBAC).
// Le projet est créé « vide » : c'est le maître d'œuvre qui le découpe ensuite en
// étapes, puis en activités, puis en tâches.
export async function createProjet(input: NewProjetInput): Promise<Projet> {
  const id = `p-${Date.now().toString(36)}`;
  const statut: StatusKey = input.delaiRestantJours < 0 ? "late" : "ontime";

  const draft: Projet = {
    ...input,
    id,
    statut,
    avancement: 0,
    budgetConsomme: 0,
    etapes: [],
    taches: [],
  };

  await sql`
    INSERT INTO projets (id, intitule, type, region, moa, lot, statut, avancement, budget_total, budget_consomme, delai_restant_jours, lat, lng)
    VALUES (${draft.id}, ${draft.intitule}, ${draft.type}, ${draft.region}, ${draft.moa}, ${draft.lot}, ${draft.statut}, ${draft.avancement}, ${draft.budgetTotal}, ${draft.budgetConsomme}, ${draft.delaiRestantJours}, ${draft.lat}, ${draft.lng})
  `;
  await logEvent(await getActeurNom(), "a créé le projet", draft.intitule);
  return draft;
}

export interface UpdateProjetInput {
  intitule: string;
  type: Projet["type"];
  region: string;
  moa: string;
  lot: string;
  budgetTotal: number;
  budgetConsomme: number;
  delaiRestantJours: number;
  lat: number;
  lng: number;
}

// Met à jour les informations d'un projet (BF-04). L'état est recalculé à partir
// du délai restant et des tâches existantes ; l'avancement reste piloté par les tâches.
export async function updateProjet(id: string, input: UpdateProjetInput): Promise<Projet | undefined> {
  const existing = await getProjet(id);
  if (!existing) return undefined;
  const merged = recompute({ ...existing, ...input });
  await sql`
    UPDATE projets SET
      intitule = ${merged.intitule},
      type = ${merged.type},
      region = ${merged.region},
      moa = ${merged.moa},
      lot = ${merged.lot},
      budget_total = ${merged.budgetTotal},
      budget_consomme = ${merged.budgetConsomme},
      delai_restant_jours = ${merged.delaiRestantJours},
      lat = ${merged.lat},
      lng = ${merged.lng},
      statut = ${merged.statut}
    WHERE id = ${id}
  `;
  await logEvent(await getActeurNom(), "a modifié le projet", merged.intitule);
  return merged;
}

// Libellés de statut pour le journal d'audit (sans dépendance UI / icônes).
const STATUT_LABEL: Record<StatusKey, string> = {
  ontime: "Dans les délais",
  risk: "À risque",
  late: "En retard",
  done: "Terminé",
  paused: "En pause",
};

// Change directement le statut d'un projet (override manuel, sans recalcul).
export async function setProjetStatut(id: string, statut: StatusKey): Promise<Projet | undefined> {
  const existing = await getProjet(id);
  if (!existing) return undefined;
  await sql`UPDATE projets SET statut = ${statut} WHERE id = ${id}`;
  await logEvent(await getActeurNom(), "a changé le statut du projet", `${existing.intitule} → ${STATUT_LABEL[statut]}`);
  return { ...existing, statut };
}

// Supprime un projet et, par cascade (schéma), ses tâches, alertes et documents.
export async function deleteProjet(id: string): Promise<boolean> {
  const rows = (await sql`DELETE FROM projets WHERE id = ${id} RETURNING intitule`) as Record<string, unknown>[];
  if (!rows.length) return false;
  await logEvent(await getActeurNom(), "a supprimé le projet", rows[0].intitule as string);
  return true;
}

// Erreur métier : tentative d'agir sur une activité/étape encore verrouillée.
export class VerrouillageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerrouillageError";
  }
}

export async function updateTacheAvancement(
  projetId: string,
  tacheId: string,
  avancement: number
): Promise<Projet | undefined> {
  const v = Math.max(0, Math.min(100, Math.round(avancement)));

  const projet = await getProjet(projetId);
  if (!projet) return undefined;

  // Localise la tâche et l'activité qui la contient pour vérifier le verrou.
  const activite = projet.etapes
    .flatMap((e) => e.activites)
    .find((a) => a.taches.some((t) => t.id === tacheId));
  const cible = activite?.taches.find((t) => t.id === tacheId);
  if (!cible) return undefined;
  if (activite!.verrouillee) {
    throw new VerrouillageError(
      "Activité verrouillée : l'activité ou l'étape précédente n'est pas encore terminée."
    );
  }

  const nouveauStatut: StatusKey = v >= 100 ? "done" : cible.statut === "done" ? "ontime" : cible.statut;

  // Met à jour la tâche en base puis recharge le projet (recalcul auto des
  // avancements/états d'activité, d'étape et du projet).
  await sql`
    UPDATE taches SET avancement = ${v}, statut = ${nouveauStatut}
    WHERE projet_id = ${projetId} AND id = ${tacheId}
  `;
  const updated = await getProjet(projetId);
  if (!updated) return undefined;
  await persistDerived(updated);

  await logEvent(await getActeurNom(), "a mis à jour l'avancement de la tâche", `${cible.intitule} → ${v}%`);
  return updated;
}

// Recharge un projet et resynchronise les valeurs dérivées (après une opération
// de structure : ajout/suppression d'étape, d'activité ou de tâche).
async function reloadAndSync(projetId: string): Promise<Projet | undefined> {
  const projet = await getProjet(projetId);
  if (projet) await persistDerived(projet);
  return projet;
}

// Identifiant court et unique au sein d'un projet (« e-… », « a-… », « t-… »).
function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.round(performance.now()).toString(36)}`;
}

// — Découpage hiérarchique : étapes (maître d'œuvre) —

export async function createEtape(projetId: string, intitule: string): Promise<Projet | undefined> {
  const existing = await getProjet(projetId);
  if (!existing) return undefined;
  const id = genId("e");
  const ordre = existing.etapes.length + 1;
  await sql`
    INSERT INTO etapes (id, projet_id, intitule, ordre, avancement, statut)
    VALUES (${id}, ${projetId}, ${intitule}, ${ordre}, 0, 'ontime')
  `;
  await logEvent(await getActeurNom(), "a ajouté une étape", `${existing.intitule} → ${intitule}`);
  return reloadAndSync(projetId);
}

export async function updateEtape(projetId: string, etapeId: string, intitule: string): Promise<Projet | undefined> {
  const rows = (await sql`
    UPDATE etapes SET intitule = ${intitule} WHERE projet_id = ${projetId} AND id = ${etapeId} RETURNING id
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  await logEvent(await getActeurNom(), "a renommé une étape", intitule);
  return getProjet(projetId);
}

export async function deleteEtape(projetId: string, etapeId: string): Promise<Projet | undefined> {
  const rows = (await sql`
    DELETE FROM etapes WHERE projet_id = ${projetId} AND id = ${etapeId} RETURNING intitule
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  await logEvent(await getActeurNom(), "a supprimé une étape", rows[0].intitule as string);
  return reloadAndSync(projetId);
}

// — Activités (maître d'œuvre) —

export async function createActivite(projetId: string, etapeId: string, intitule: string): Promise<Projet | undefined> {
  const existing = await getProjet(projetId);
  if (!existing) return undefined;
  const etape = existing.etapes.find((e) => e.id === etapeId);
  if (!etape) return undefined;
  const id = genId("a");
  const ordre = etape.activites.length + 1;
  await sql`
    INSERT INTO activites (id, projet_id, etape_id, intitule, ordre, avancement, statut)
    VALUES (${id}, ${projetId}, ${etapeId}, ${intitule}, ${ordre}, 0, 'ontime')
  `;
  await logEvent(await getActeurNom(), "a ajouté une activité", `${etape.intitule} → ${intitule}`);
  return reloadAndSync(projetId);
}

export async function updateActivite(projetId: string, activiteId: string, intitule: string): Promise<Projet | undefined> {
  const rows = (await sql`
    UPDATE activites SET intitule = ${intitule} WHERE projet_id = ${projetId} AND id = ${activiteId} RETURNING id
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  await logEvent(await getActeurNom(), "a renommé une activité", intitule);
  return getProjet(projetId);
}

export async function deleteActivite(projetId: string, activiteId: string): Promise<Projet | undefined> {
  const rows = (await sql`
    DELETE FROM activites WHERE projet_id = ${projetId} AND id = ${activiteId} RETURNING intitule
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  await logEvent(await getActeurNom(), "a supprimé une activité", rows[0].intitule as string);
  return reloadAndSync(projetId);
}

// — Tâches (création/modification/suppression : maître d'œuvre + super-admin) —

export interface NewTacheInput {
  activiteId: string;
  intitule: string;
  responsable?: string;
  echeance?: string | null;
}

export async function createTache(projetId: string, input: NewTacheInput): Promise<Projet | undefined> {
  const existing = await getProjet(projetId);
  if (!existing) return undefined;
  const activite = existing.etapes.flatMap((e) => e.activites).find((a) => a.id === input.activiteId);
  if (!activite) return undefined;
  const id = genId("t");
  const ordre = activite.taches.length + 1;
  await sql`
    INSERT INTO taches (id, projet_id, etape_id, activite_id, ordre, intitule, avancement, statut, responsable, echeance)
    VALUES (${id}, ${projetId}, ${activite.etapeId}, ${input.activiteId}, ${ordre}, ${input.intitule}, 0, 'ontime', ${input.responsable ?? ""}, ${input.echeance ?? null})
  `;
  await logEvent(await getActeurNom(), "a créé la tâche", `${activite.intitule} → ${input.intitule}`);
  return reloadAndSync(projetId);
}

export interface UpdateTacheInput {
  intitule: string;
  responsable?: string;
  echeance?: string | null;
}

export async function updateTache(projetId: string, tacheId: string, input: UpdateTacheInput): Promise<Projet | undefined> {
  const rows = (await sql`
    UPDATE taches
    SET intitule = ${input.intitule}, responsable = ${input.responsable ?? ""}, echeance = ${input.echeance ?? null}
    WHERE projet_id = ${projetId} AND id = ${tacheId} RETURNING intitule
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  await logEvent(await getActeurNom(), "a modifié la tâche", rows[0].intitule as string);
  return getProjet(projetId);
}

export async function deleteTache(projetId: string, tacheId: string): Promise<Projet | undefined> {
  const rows = (await sql`
    DELETE FROM taches WHERE projet_id = ${projetId} AND id = ${tacheId} RETURNING intitule
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  await logEvent(await getActeurNom(), "a supprimé la tâche", rows[0].intitule as string);
  return reloadAndSync(projetId);
}

// — Affectation d'une tâche à des ouvriers (maître d'œuvre) —
// Remplace l'ensemble des affectations de la tâche par la liste fournie.
export async function setTacheOuvriers(
  projetId: string,
  tacheId: string,
  ouvrierIds: string[]
): Promise<Projet | undefined> {
  const existing = await getProjet(projetId);
  const tache = existing?.taches.find((t) => t.id === tacheId);
  if (!existing || !tache) return undefined;

  // Restreint aux comptes ouvriers existants.
  const valides = ouvrierIds.length
    ? ((await sql`SELECT id, nom FROM utilisateurs WHERE role = 'ouvrier' AND id = ANY(${ouvrierIds})`) as Record<string, unknown>[])
    : [];

  const batch: ReturnType<typeof sql>[] = [
    sql`DELETE FROM tache_ouvriers WHERE projet_id = ${projetId} AND tache_id = ${tacheId}`,
  ];
  for (const o of valides) {
    batch.push(sql`
      INSERT INTO tache_ouvriers (projet_id, tache_id, ouvrier_id)
      VALUES (${projetId}, ${tacheId}, ${o.id as string})
      ON CONFLICT DO NOTHING
    `);
  }
  await sql.transaction(batch);

  const noms = valides.map((o) => o.nom as string).join(", ") || "aucun ouvrier";
  await logEvent(await getActeurNom(), "a affecté la tâche", `${tache.intitule} → ${noms}`);
  return getProjet(projetId);
}

// — Remarques sur une tâche (maître d'ouvrage + super-administrateur) —

export async function addRemarque(
  projetId: string,
  tacheId: string,
  contenu: string
): Promise<Projet | undefined> {
  const existing = await getProjet(projetId);
  const tache = existing?.taches.find((t) => t.id === tacheId);
  if (!existing || !tache) return undefined;
  const id = genId("r");
  const auteur = await getActeurNom();
  await sql`
    INSERT INTO remarques (id, projet_id, tache_id, auteur, contenu)
    VALUES (${id}, ${projetId}, ${tacheId}, ${auteur}, ${contenu})
  `;
  await logEvent(auteur, "a ajouté une remarque sur la tâche", tache.intitule);
  return getProjet(projetId);
}

export async function deleteRemarque(projetId: string, remarqueId: string): Promise<Projet | undefined> {
  const rows = (await sql`
    DELETE FROM remarques WHERE projet_id = ${projetId} AND id = ${remarqueId} RETURNING tache_id
  `) as Record<string, unknown>[];
  if (!rows.length) return undefined;
  await logEvent(await getActeurNom(), "a supprimé une remarque", "");
  return getProjet(projetId);
}

// — Journal d'audit (BF-15 / BNF-09) —

export async function getJournal(): Promise<EntreeJournal[]> {
  const rows = (await sql`SELECT * FROM journal ORDER BY date DESC, id DESC`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    acteur: r.acteur as string,
    action: r.action as string,
    cible: r.cible as string,
    date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
  }));
}

// Enregistre une action dans le journal. Best-effort : un échec d'écriture du
// journal ne doit jamais faire échouer l'action métier qui l'a déclenché.
export async function logEvent(acteur: string, action: string, cible: string): Promise<void> {
  try {
    const id = `j-${Date.now().toString(36)}-${Math.round(performance.now())}`;
    await sql`
      INSERT INTO journal (id, acteur, action, cible)
      VALUES (${id}, ${acteur}, ${action}, ${cible})
    `;
  } catch (err) {
    console.error("logEvent", err);
  }
}

// — Demandes de contact (formulaire de la vitrine publique) —

export interface ContactInput {
  nom: string;
  organisation?: string;
  email: string;
  message: string;
}

export async function createContact(input: ContactInput): Promise<{ id: string }> {
  const id = `c-${Date.now().toString(36)}`;
  await sql`
    INSERT INTO contacts (id, nom, organisation, email, message)
    VALUES (${id}, ${input.nom}, ${input.organisation ?? null}, ${input.email}, ${input.message})
  `;
  await logEvent("Site public", "a envoyé une demande de contact", `${input.nom} (${input.email})`);
  return { id };
}

export interface DemandeContact extends ContactInput {
  id: string;
  date: string;
}

export async function getContacts(): Promise<DemandeContact[]> {
  const rows = (await sql`SELECT * FROM contacts ORDER BY created_at DESC`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    nom: r.nom as string,
    organisation: (r.organisation as string) ?? undefined,
    email: r.email as string,
    message: r.message as string,
    date: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}
