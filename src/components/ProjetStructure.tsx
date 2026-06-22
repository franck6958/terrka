"use client";

import { useEffect, useState } from "react";
import {
  Lock,
  Plus,
  Pencil,
  Trash2,
  Users,
  MessageSquarePlus,
  Layers,
  ListChecks,
  CalendarClock,
  Hourglass,
  Check,
  X,
  Search,
} from "lucide-react";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { AvancementControl } from "./AvancementControl";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { canGererStructure, canRemarquer, canMajAvancement, canValiderCloture } from "@/lib/rbac";
import type { Projet, Etape, Activite, Tache, Utilisateur } from "@/lib/types";

// Affiche et pilote le découpage hiérarchique d'un projet :
//   étapes → activités → tâches, avec progression automatique, verrouillage
//   séquentiel, affectation aux ouvriers (MOE) et remarques (MOA / super-admin).
export function ProjetStructure({ projet }: { projet: Projet }) {
  const { user } = useAuth();
  const { addEtape } = useStore();
  const role = user?.role ?? "";
  const peutDecouper = canGererStructure(role);

  const [ajoutEtape, setAjoutEtape] = useState(false);

  const progressionGlobale = projet.etapes.length > 0;

  return (
    <section className="card p-5 lg:col-span-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2">
          <Layers size={18} className="text-brand-interactive" /> Étapes, activités & tâches
        </h2>
        {peutDecouper && (
          <button type="button" onClick={() => setAjoutEtape(true)} className="btn btn-secondary text-sm">
            <Plus size={15} /> Étape
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-muted">
        Le maître d&apos;œuvre découpe le projet. Une étape (ou une activité) ne se débloque que
        lorsque la précédente est terminée ; l&apos;avancement remonte automatiquement.
      </p>

      {!progressionGlobale ? (
        <div className="rounded-control bg-surface p-6 text-center text-sm text-muted">
          {peutDecouper
            ? "Aucune étape pour l’instant. Commencez par ajouter une étape."
            : "Le maître d’œuvre n’a pas encore découpé ce projet en étapes."}
        </div>
      ) : (
        <div className="space-y-4">
          {projet.etapes.map((etape, i) => (
            <EtapeBloc key={etape.id} projet={projet} etape={etape} index={i} peutDecouper={peutDecouper} role={role} />
          ))}
        </div>
      )}

      <TextPromptModal
        open={ajoutEtape}
        title="Ajouter une étape"
        label="Intitulé de l’étape"
        submitLabel="Ajouter"
        onClose={() => setAjoutEtape(false)}
        onSubmit={async (v) => {
          const ok = await addEtape(projet.id, v);
          if (ok) setAjoutEtape(false);
        }}
      />
    </section>
  );
}

function EtapeBloc({
  projet,
  etape,
  index,
  peutDecouper,
  role,
}: {
  projet: Projet;
  etape: Etape;
  index: number;
  peutDecouper: boolean;
  role: string;
}) {
  const { renameEtape, removeEtape, addActivite } = useStore();
  const [renomme, setRenomme] = useState(false);
  const [ajoutAct, setAjoutAct] = useState(false);

  return (
    <div className={`rounded-card border ${etape.verrouillee ? "border-line bg-surface/60" : "border-line bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Étape {index + 1}</span>
            {etape.verrouillee && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Lock size={12} /> verrouillée
              </span>
            )}
          </div>
          <p className="truncate text-sm font-semibold text-ink">{etape.intitule}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge statut={etape.statut} />
          <span className="kpi w-10 text-right text-sm">{etape.avancement}%</span>
          {peutDecouper && (
            <NiveauActions
              onRename={() => setRenomme(true)}
              onDelete={() => {
                if (confirm(`Supprimer l’étape « ${etape.intitule} » et tout son contenu ?`)) removeEtape(projet.id, etape.id);
              }}
            />
          )}
        </div>
      </div>
      <div className="px-4">
        <ProgressBar value={etape.avancement} tone={etape.statut === "late" ? "late" : etape.statut === "risk" ? "risk" : etape.statut === "done" ? "interactive" : "ontime"} />
      </div>

      <div className="space-y-3 p-4">
        {etape.activites.length === 0 ? (
          <p className="text-xs text-muted">Aucune activité dans cette étape.</p>
        ) : (
          etape.activites.map((activite, j) => (
            <ActiviteBloc key={activite.id} projet={projet} activite={activite} index={j} peutDecouper={peutDecouper} role={role} />
          ))
        )}
        {peutDecouper && (
          <button type="button" onClick={() => setAjoutAct(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-interactive hover:underline">
            <Plus size={14} /> Ajouter une activité
          </button>
        )}
      </div>

      <TextPromptModal
        open={renomme}
        title="Renommer l’étape"
        label="Intitulé de l’étape"
        defaultValue={etape.intitule}
        submitLabel="Enregistrer"
        onClose={() => setRenomme(false)}
        onSubmit={async (v) => {
          const ok = await renameEtape(projet.id, etape.id, v);
          if (ok) setRenomme(false);
        }}
      />
      <TextPromptModal
        open={ajoutAct}
        title="Ajouter une activité"
        label="Intitulé de l’activité"
        submitLabel="Ajouter"
        onClose={() => setAjoutAct(false)}
        onSubmit={async (v) => {
          const ok = await addActivite(projet.id, etape.id, v);
          if (ok) setAjoutAct(false);
        }}
      />
    </div>
  );
}

function ActiviteBloc({
  projet,
  activite,
  index,
  peutDecouper,
  role,
}: {
  projet: Projet;
  activite: Activite;
  index: number;
  peutDecouper: boolean;
  role: string;
}) {
  const { renameActivite, removeActivite, addTache } = useStore();
  const [renomme, setRenomme] = useState(false);
  const [ajoutTache, setAjoutTache] = useState(false);

  return (
    <div className="rounded-control border border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <ListChecks size={15} className="shrink-0 text-slate" />
          <span className="text-xs text-muted">Activité {index + 1} ·</span>
          <span className="truncate text-sm font-medium text-ink">{activite.intitule}</span>
          {activite.verrouillee && <Lock size={12} className="shrink-0 text-muted" />}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge statut={activite.statut} />
          <span className="kpi w-9 text-right text-xs">{activite.avancement}%</span>
          {peutDecouper && (
            <NiveauActions
              onRename={() => setRenomme(true)}
              onDelete={() => {
                if (confirm(`Supprimer l’activité « ${activite.intitule} » et ses tâches ?`)) removeActivite(projet.id, activite.id);
              }}
            />
          )}
        </div>
      </div>
      <div className="px-3">
        <ProgressBar value={activite.avancement} tone={activite.statut === "late" ? "late" : activite.statut === "risk" ? "risk" : activite.statut === "done" ? "interactive" : "ontime"} />
      </div>

      {activite.verrouillee && (
        <p className="flex items-center gap-1.5 px-3 pt-2 text-xs text-muted">
          <Lock size={12} /> Activité verrouillée : terminez l’activité (ou l’étape) précédente pour la débloquer.
        </p>
      )}

      <div className="space-y-4 p-3">
        {activite.taches.length === 0 ? (
          <p className="text-xs text-muted">Aucune tâche.</p>
        ) : (
          activite.taches.map((tache) => (
            <TacheBloc key={tache.id} projet={projet} activite={activite} tache={tache} role={role} peutDecouper={peutDecouper} />
          ))
        )}
        {peutDecouper && (
          <button type="button" onClick={() => setAjoutTache(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-interactive hover:underline">
            <Plus size={14} /> Ajouter une tâche
          </button>
        )}
      </div>

      <TextPromptModal
        open={renomme}
        title="Renommer l’activité"
        label="Intitulé de l’activité"
        defaultValue={activite.intitule}
        submitLabel="Enregistrer"
        onClose={() => setRenomme(false)}
        onSubmit={async (v) => {
          const ok = await renameActivite(projet.id, activite.id, v);
          if (ok) setRenomme(false);
        }}
      />
      <TacheModal
        open={ajoutTache}
        title="Ajouter une tâche"
        onClose={() => setAjoutTache(false)}
        onSubmit={async (data) => {
          const ok = await addTache(projet.id, { activiteId: activite.id, ...data });
          if (ok) setAjoutTache(false);
        }}
      />
    </div>
  );
}

function TacheBloc({
  projet,
  activite,
  tache,
  role,
  peutDecouper,
}: {
  projet: Projet;
  activite: Activite;
  tache: Tache;
  role: string;
  peutDecouper: boolean;
}) {
  const { utilisateurs, updateTacheMeta, removeTache, setTacheOuvriers, addRemarque, removeRemarque, validerClotureTache } = useStore();
  const [edit, setEdit] = useState(false);
  const [affecte, setAffecte] = useState(false);
  const [remarques, setRemarques] = useState(false);
  const [nouvelleRemarque, setNouvelleRemarque] = useState("");
  const [statuant, setStatuant] = useState(false);
  const [refus, setRefus] = useState(false);

  const peutMaj = canMajAvancement(role) && !activite.verrouillee;
  const peutRemarquer = canRemarquer(role);
  const peutValider = canValiderCloture(role);
  const enAttente = tache.validation === "en_attente";
  const ouvriersDispo = utilisateurs.filter((u) => u.role === "ouvrier");

  return (
    <div className="border-b border-line pb-4 last:border-0 last:pb-0">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{tache.intitule}</span>
        <StatusBadge statut={tache.statut} />
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar
          value={tache.avancement}
          tone={tache.statut === "late" ? "late" : tache.statut === "risk" ? "risk" : tache.statut === "done" ? "interactive" : "ontime"}
        />
        <span className="kpi w-10 shrink-0 text-right text-sm">{tache.avancement}%</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <CalendarClock size={13} />
          {tache.echeance ? `échéance ${new Date(tache.echeance).toLocaleDateString("fr-FR")}` : "sans échéance"}
          {tache.responsable && <span>· {tache.responsable}</span>}
        </p>
        {peutMaj ? (
          <AvancementControl projetId={projet.id} tacheId={tache.id} value={tache.avancement} />
        ) : (
          activite.verrouillee && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Lock size={12} /> verrouillée
            </span>
          )
        )}
      </div>

      {/* Demande de clôture déposée par l'ouvrier : validation du maître d'œuvre */}
      {enAttente && (
        <div className="mt-3 rounded-control border border-state-risk/30 bg-state-risk/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-state-risk">
            <Hourglass size={14} aria-hidden /> Un ouvrier a déclaré cette tâche terminée
          </p>
          {peutValider ? (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={statuant}
                onClick={async () => {
                  setStatuant(true);
                  await validerClotureTache(projet.id, tache.id, true);
                  setStatuant(false);
                }}
                className="btn btn-primary text-xs disabled:opacity-60"
              >
                <Check size={14} aria-hidden /> Valider la clôture
              </button>
              <button
                type="button"
                disabled={statuant}
                onClick={() => setRefus(true)}
                className="btn btn-secondary text-xs disabled:opacity-60"
              >
                <X size={14} aria-hidden /> Refuser
              </button>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted">En attente de la vérification du maître d&apos;œuvre.</p>
          )}
        </div>
      )}

      {/* Ouvriers affectés */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Users size={13} className="text-muted" />
        {tache.ouvriers.length === 0 ? (
          <span className="text-xs text-muted">Aucun ouvrier affecté</span>
        ) : (
          tache.ouvriers.map((o) => (
            <span key={o.id} className="rounded-full bg-surface px-2 py-0.5 text-xs text-slate">{o.nom}</span>
          ))
        )}
        {peutDecouper && (
          <button type="button" onClick={() => setAffecte(true)} className="text-xs font-medium text-brand-interactive hover:underline">
            Affecter
          </button>
        )}
      </div>

      {/* Actions MOE : modifier / supprimer */}
      {peutDecouper && (
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={() => setEdit(true)} className="inline-flex items-center gap-1 text-xs text-slate hover:text-ink">
            <Pencil size={12} /> Modifier
          </button>
          <button
            type="button"
            onClick={() => { if (confirm(`Supprimer la tâche « ${tache.intitule} » ?`)) removeTache(projet.id, tache.id); }}
            className="inline-flex items-center gap-1 text-xs text-state-late hover:underline"
          >
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      )}

      {/* Remarques */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setRemarques((o) => !o)}
          className="inline-flex items-center gap-1 text-xs text-slate hover:text-ink"
        >
          <MessageSquarePlus size={13} /> Remarques ({tache.remarques.length})
        </button>
        {remarques && (
          <div className="mt-2 space-y-2 rounded-control bg-surface p-3">
            {tache.remarques.length === 0 ? (
              <p className="text-xs text-muted">Aucune remarque.</p>
            ) : (
              tache.remarques.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 text-xs">
                  <p className="text-slate">
                    <span className="font-medium text-ink">{r.auteur}</span>{" "}
                    <span className="text-muted">· {new Date(r.date).toLocaleDateString("fr-FR")}</span>
                    <br />
                    {r.contenu}
                  </p>
                  {peutRemarquer && (
                    <button type="button" aria-label="Supprimer la remarque" onClick={() => removeRemarque(projet.id, r.id)} className="text-muted hover:text-state-late">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
            {peutRemarquer && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const v = nouvelleRemarque.trim();
                  if (!v) return;
                  const ok = await addRemarque(projet.id, tache.id, v);
                  if (ok) setNouvelleRemarque("");
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  value={nouvelleRemarque}
                  onChange={(e) => setNouvelleRemarque(e.target.value)}
                  placeholder="Ajouter une remarque…"
                  className="input flex-1 text-xs"
                />
                <button type="submit" className="btn btn-primary text-xs">Ajouter</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Modale d'édition de la tâche */}
      <TacheModal
        open={edit}
        title="Modifier la tâche"
        defaultValue={{ intitule: tache.intitule, responsable: tache.responsable, echeance: tache.echeance }}
        onClose={() => setEdit(false)}
        onSubmit={async (data) => {
          const ok = await updateTacheMeta(projet.id, tache.id, data);
          if (ok) setEdit(false);
        }}
      />

      {/* Modale d'affectation des ouvriers */}
      <AffectationOuvriersModal
        open={affecte}
        onClose={() => setAffecte(false)}
        ouvriers={ouvriersDispo}
        dejaAffectes={tache.ouvriers.map((o) => o.id)}
        onSubmit={async (ids) => {
          const ok = await setTacheOuvriers(projet.id, tache.id, ids);
          if (ok) setAffecte(false);
        }}
      />

      {/* Modale de motif lors d'un refus de clôture (transmis à l'ouvrier) */}
      <TextPromptModal
        open={refus}
        title="Refuser la clôture"
        label="Motif du refus (transmis à l'ouvrier en remarque)"
        submitLabel="Refuser la clôture"
        onClose={() => setRefus(false)}
        onSubmit={async (v) => {
          const ok = await validerClotureTache(projet.id, tache.id, false, v);
          if (ok) setRefus(false);
        }}
      />
    </div>
  );
}

// Petites actions « renommer / supprimer » d'un niveau (étape ou activité).
function NiveauActions({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Renommer" onClick={onRename} className="flex h-7 w-7 items-center justify-center rounded-control border border-line text-slate hover:bg-surface">
        <Pencil size={13} />
      </button>
      <button type="button" aria-label="Supprimer" onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-control border border-line text-state-late hover:bg-surface">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// Modale générique : un seul champ texte (ajout / renommage d'étape, d'activité).
function TextPromptModal({
  open,
  title,
  label,
  defaultValue = "",
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const v = String(data.get("valeur") ?? "").trim();
          if (!v) return;
          setBusy(true);
          await onSubmit(v);
          setBusy(false);
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate">{label}</span>
          <input name="valeur" type="text" required defaultValue={defaultValue} autoFocus className="input" />
        </label>
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">{submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

// Modale d'une tâche : intitulé + responsable + échéance.
function TacheModal({
  open,
  title,
  defaultValue,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  defaultValue?: { intitule: string; responsable: string; echeance: string };
  onClose: () => void;
  onSubmit: (data: { intitule: string; responsable: string; echeance: string | null }) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const intitule = String(data.get("intitule") ?? "").trim();
          if (!intitule) return;
          const echeance = String(data.get("echeance") ?? "").trim();
          setBusy(true);
          await onSubmit({
            intitule,
            responsable: String(data.get("responsable") ?? "").trim(),
            echeance: echeance || null,
          });
          setBusy(false);
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate">Intitulé de la tâche</span>
          <input name="intitule" type="text" required defaultValue={defaultValue?.intitule} autoFocus className="input" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Équipe / responsable</span>
            <input name="responsable" type="text" defaultValue={defaultValue?.responsable} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate">Échéance</span>
            <input name="echeance" type="date" defaultValue={defaultValue?.echeance || ""} className="input" />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">Enregistrer</button>
        </div>
      </form>
    </Modal>
  );
}

// Initiales (1 à 2 lettres) pour la pastille d'un ouvrier.
function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");
}

// Modale d'affectation d'une tâche : liste TOUS les comptes ouvriers (nom +
// e-mail), avec recherche, sélection multiple et « tout sélectionner », pour que
// le maître d'œuvre choisisse en connaissance de cause qui réalise la tâche.
function AffectationOuvriersModal({
  open,
  onClose,
  ouvriers,
  dejaAffectes,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  ouvriers: Utilisateur[];
  dejaAffectes: string[];
  onSubmit: (ids: string[]) => void | Promise<void>;
}) {
  const [selection, setSelection] = useState<string[]>(dejaAffectes);
  const [recherche, setRecherche] = useState("");
  const [busy, setBusy] = useState(false);

  // À chaque ouverture, repartir de la liste réellement affectée à la tâche.
  useEffect(() => {
    if (open) {
      setSelection(dejaAffectes);
      setRecherche("");
    }
    // dejaAffectes volontairement omis : on ne réinitialise qu'à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const terme = recherche.trim().toLowerCase();
  const filtres = terme
    ? ouvriers.filter((o) => o.nom.toLowerCase().includes(terme) || o.email.toLowerCase().includes(terme))
    : ouvriers;

  const toggle = (id: string) =>
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal open={open} onClose={onClose} title="Affecter la tâche à des ouvriers">
      {ouvriers.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun compte ouvrier n&apos;existe encore. Demandez à un administrateur d&apos;en créer.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Recherche par nom ou e-mail */}
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un ouvrier par nom ou e-mail…"
              className="input pl-9"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              {selection.length} sélectionné{selection.length > 1 ? "s" : ""} sur {ouvriers.length} ouvrier{ouvriers.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setSelection(selection.length === ouvriers.length ? [] : ouvriers.map((o) => o.id))}
              className="font-medium text-brand-interactive hover:underline"
            >
              {selection.length === ouvriers.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>

          {/* Liste des ouvriers (nom + e-mail) */}
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-control border border-line p-1">
            {filtres.length === 0 ? (
              <p className="p-3 text-sm text-muted">Aucun ouvrier ne correspond à votre recherche.</p>
            ) : (
              filtres.map((o) => {
                const coche = selection.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm hover:bg-surface ${coche ? "bg-brand-interactive/5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={() => toggle(o.id)}
                      className="h-4 w-4 accent-brand-interactive"
                    />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-slate">
                      {initiales(o.nom)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">
                        {o.nom} {!o.actif && <span className="text-xs text-muted">(inactif)</span>}
                      </span>
                      <span className="block truncate text-xs text-muted">{o.email}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary">Annuler</button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onSubmit(selection);
                setBusy(false);
              }}
              className="btn btn-primary disabled:opacity-60"
            >
              Enregistrer l&apos;affectation
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
