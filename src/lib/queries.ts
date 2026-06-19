import "server-only";
import { sql } from "./db";
import { getActeurNom } from "./auth";
import type { Projet, Tache, Alerte, Utilisateur, Document, EntreeJournal, StatusKey, Role, DocumentType } from "./types";

// Couche d'accès aux données TREKKA — traduit les lignes Postgres
// vers les types métier (cf. types.ts). Toutes ces fonctions s'exécutent
// côté serveur uniquement.

function rowToTache(r: Record<string, unknown>): Tache {
  return {
    id: r.id as string,
    intitule: r.intitule as string,
    avancement: Number(r.avancement),
    statut: r.statut as StatusKey,
    responsable: r.responsable as string,
    echeance: (r.echeance as Date | string) instanceof Date
      ? (r.echeance as Date).toISOString().slice(0, 10)
      : String(r.echeance).slice(0, 10),
  };
}

function rowToProjet(r: Record<string, unknown>, taches: Tache[]): Projet {
  return {
    id: r.id as string,
    intitule: r.intitule as string,
    type: r.type as Projet["type"],
    region: r.region as string,
    moa: r.moa as string,
    lot: r.lot as string,
    statut: r.statut as StatusKey,
    avancement: Number(r.avancement),
    budgetTotal: Number(r.budget_total),
    budgetConsomme: Number(r.budget_consomme),
    delaiRestantJours: Number(r.delai_restant_jours),
    lat: Number(r.lat),
    lng: Number(r.lng),
    taches,
  };
}

export async function getProjets(): Promise<Projet[]> {
  const [projets, taches] = await Promise.all([
    sql`SELECT * FROM projets ORDER BY created_at DESC, id`,
    sql`SELECT * FROM taches ORDER BY projet_id, id`,
  ]);
  const tachesByProjet = new Map<string, Tache[]>();
  for (const t of taches as Record<string, unknown>[]) {
    const pid = t.projet_id as string;
    if (!tachesByProjet.has(pid)) tachesByProjet.set(pid, []);
    tachesByProjet.get(pid)!.push(rowToTache(t));
  }
  return (projets as Record<string, unknown>[]).map((p) =>
    rowToProjet(p, tachesByProjet.get(p.id as string) ?? [])
  );
}

export async function getProjet(id: string): Promise<Projet | undefined> {
  const projets = (await sql`SELECT * FROM projets WHERE id = ${id}`) as Record<string, unknown>[];
  if (projets.length === 0) return undefined;
  const taches = (await sql`SELECT * FROM taches WHERE projet_id = ${id} ORDER BY id`) as Record<string, unknown>[];
  return rowToProjet(projets[0], taches.map(rowToTache));
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

export async function createProjet(input: NewProjetInput): Promise<Projet> {
  const id = `p-${Date.now().toString(36)}`;
  const statut: StatusKey = input.delaiRestantJours < 0 ? "late" : "ontime";
  const echeance = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  const draft: Projet = recompute({
    ...input,
    id,
    statut,
    avancement: 0,
    budgetConsomme: 0,
    taches: [
      { id: "t-1", intitule: "Démarrage et installation de chantier", avancement: 0, statut: "ontime", responsable: "À affecter", echeance },
    ],
  });

  await sql`
    INSERT INTO projets (id, intitule, type, region, moa, lot, statut, avancement, budget_total, budget_consomme, delai_restant_jours, lat, lng)
    VALUES (${draft.id}, ${draft.intitule}, ${draft.type}, ${draft.region}, ${draft.moa}, ${draft.lot}, ${draft.statut}, ${draft.avancement}, ${draft.budgetTotal}, ${draft.budgetConsomme}, ${draft.delaiRestantJours}, ${draft.lat}, ${draft.lng})
  `;
  for (const t of draft.taches) {
    await sql`
      INSERT INTO taches (id, projet_id, intitule, avancement, statut, responsable, echeance)
      VALUES (${t.id}, ${draft.id}, ${t.intitule}, ${t.avancement}, ${t.statut}, ${t.responsable}, ${t.echeance})
    `;
  }
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

export async function updateTacheAvancement(
  projetId: string,
  tacheId: string,
  avancement: number
): Promise<Projet | undefined> {
  const v = Math.max(0, Math.min(100, Math.round(avancement)));

  const projet = await getProjet(projetId);
  if (!projet) return undefined;

  const taches = projet.taches.map((t) =>
    t.id === tacheId
      ? { ...t, avancement: v, statut: (v >= 100 ? "done" : t.statut === "done" ? "ontime" : t.statut) as StatusKey }
      : t
  );
  const updated = recompute({ ...projet, taches });
  const tache = updated.taches.find((t) => t.id === tacheId);
  if (!tache) return updated;

  await sql`
    UPDATE taches SET avancement = ${tache.avancement}, statut = ${tache.statut}
    WHERE projet_id = ${projetId} AND id = ${tacheId}
  `;
  await sql`
    UPDATE projets SET avancement = ${updated.avancement}, statut = ${updated.statut}
    WHERE id = ${projetId}
  `;
  await logEvent(await getActeurNom(), "a mis à jour l'avancement de la tâche", `${tache.intitule} → ${tache.avancement}%`);
  return updated;
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
