"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { computeAlertes } from "./alertes";
import type { Projet, StatusKey, Alerte, Utilisateur, Document, Role, DocumentType } from "./types";

interface NewProjetInput {
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

interface NewUtilisateurInput {
  nom: string;
  email: string;
  role: Role;
}

interface UpdateProjetInput {
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

interface NewDocumentInput {
  projetId: string;
  nom: string;
  type: DocumentType;
  taille: string;
  /** Contenu du fichier encodé en base64 (sans préfixe data:). */
  contenu?: string | null;
  mime?: string | null;
}

interface UpdateDocumentInput {
  nom: string;
  type: DocumentType;
  projetId: string;
}

interface StoreValue {
  projets: Projet[];
  alertes: Alerte[];
  /** Alertes non encore lues (marquées comme lues exclues) — pour la cloche. */
  alertesNonLues: Alerte[];
  utilisateurs: Utilisateur[];
  documents: Document[];
  hydrated: boolean;
  error: string | null;
  addProjet: (input: NewProjetInput) => Promise<string | null>;
  updateProjet: (id: string, input: UpdateProjetInput) => Promise<boolean>;
  setProjetStatut: (id: string, statut: StatusKey) => Promise<boolean>;
  deleteProjet: (id: string) => Promise<boolean>;
  duplicateProjet: (id: string) => Promise<string | null>;
  updateTacheAvancement: (projetId: string, tacheId: string, avancement: number) => Promise<void>;
  addUtilisateur: (input: NewUtilisateurInput) => Promise<boolean>;
  setUtilisateurActif: (id: string, actif: boolean) => Promise<void>;
  setUtilisateurRole: (id: string, role: Role) => Promise<boolean>;
  updateUtilisateur: (id: string, input: { nom: string; email: string }) => Promise<boolean>;
  resetMotDePasseUtilisateur: (id: string, motDePasse: string) => Promise<boolean>;
  deleteUtilisateur: (id: string) => Promise<boolean>;
  addDocument: (input: NewDocumentInput) => Promise<boolean>;
  updateDocument: (id: string, input: UpdateDocumentInput) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<void>;
  /** Marque une alerte comme lue (disparaît de la cloche). Persistant (localStorage). */
  marquerAlerteLue: (id: string) => void;
  /** Marque toutes les alertes courantes comme lues. */
  marquerToutesAlertesLues: () => void;
}

const ALERTES_LUES_KEY = "trekka:alertes-lues:v1";

const StoreContext = createContext<StoreValue | null>(null);

// Recalcule l'avancement global (moyenne des tâches) et l'état du projet.
// Utilisé pour la mise à jour optimiste de l'UI ; la base recalcule de son côté.
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Identifiants des alertes marquées comme lues (persisté localement par navigateur).
  const [alertesLues, setAlertesLues] = useState<string[]>([]);

  // Chargement de l'état « lu » des alertes depuis localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ALERTES_LUES_KEY);
      if (raw) setAlertesLues(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persistLues = useCallback((ids: string[]) => {
    setAlertesLues(ids);
    try {
      localStorage.setItem(ALERTES_LUES_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, []);

  // Chargement de l'état depuis la base Neon (via /api/bootstrap).
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const res = await fetch("/api/bootstrap", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (actif) {
          setProjets(data.projets ?? []);
          setUtilisateurs(data.utilisateurs ?? []);
          setDocuments(data.documents ?? []);
        }
      } catch (e) {
        console.error(e);
        if (actif) setError("Impossible de charger les données depuis la base.");
      } finally {
        if (actif) setHydrated(true);
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  const addProjet = useCallback(async (input: NewProjetInput) => {
    try {
      const res = await fetch("/api/projets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { projet } = (await res.json()) as { projet: Projet };
      setProjets((prev) => [projet, ...prev]);
      return projet.id;
    } catch (e) {
      console.error(e);
      setError("La création du projet a échoué.");
      return null;
    }
  }, []);

  const updateProjet = useCallback(async (id: string, input: UpdateProjetInput) => {
    try {
      const res = await fetch(`/api/projets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { projet } = (await res.json()) as { projet: Projet };
      setProjets((prev) => prev.map((p) => (p.id === projet.id ? projet : p)));
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "La modification du projet a échoué.");
      return false;
    }
  }, []);

  const setProjetStatut = useCallback(
    async (id: string, statut: StatusKey) => {
      const snapshot = projets;
      // Mise à jour optimiste.
      setProjets((prev) => prev.map((p) => (p.id === id ? { ...p, statut } : p)));
      try {
        const res = await fetch(`/api/projets/${id}/statut`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const { projet } = (await res.json()) as { projet: Projet };
        setProjets((prev) => prev.map((p) => (p.id === projet.id ? projet : p)));
        return true;
      } catch (e) {
        console.error(e);
        setProjets(snapshot); // restauration
        setError(e instanceof Error ? e.message : "Le changement de statut a échoué.");
        return false;
      }
    },
    [projets]
  );

  const deleteProjet = useCallback(
    async (id: string) => {
      const snapshot = projets;
      // Suppression optimiste.
      setProjets((prev) => prev.filter((p) => p.id !== id));
      try {
        const res = await fetch(`/api/projets/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        return true;
      } catch (e) {
        console.error(e);
        setProjets(snapshot); // restauration
        setError(e instanceof Error ? e.message : "La suppression du projet a échoué.");
        return false;
      }
    },
    [projets]
  );

  // Duplication : crée un nouveau projet à partir des caractéristiques de la source
  // (avancement et budget consommé repartent de zéro, comme une création).
  const duplicateProjet = useCallback(
    async (id: string) => {
      const src = projets.find((p) => p.id === id);
      if (!src) return null;
      return addProjet({
        intitule: `${src.intitule} (copie)`,
        type: src.type,
        region: src.region,
        moa: src.moa,
        lot: src.lot,
        budgetTotal: src.budgetTotal,
        delaiRestantJours: src.delaiRestantJours,
        lat: src.lat,
        lng: src.lng,
      });
    },
    [projets, addProjet]
  );

  const updateTacheAvancement = useCallback(
    async (projetId: string, tacheId: string, avancement: number) => {
      const v = Math.max(0, Math.min(100, Math.round(avancement)));
      // Mise à jour optimiste (recalcul local immédiat).
      setProjets((prev) =>
        prev.map((p) => {
          if (p.id !== projetId) return p;
          const taches = p.taches.map((t) =>
            t.id === tacheId
              ? { ...t, avancement: v, statut: (v >= 100 ? "done" : t.statut === "done" ? "ontime" : t.statut) as StatusKey }
              : t
          );
          return recompute({ ...p, taches });
        })
      );
      // Persistance en base, puis resynchronisation avec l'état serveur.
      try {
        const res = await fetch(`/api/projets/${projetId}/taches/${tacheId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avancement: v }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { projet } = (await res.json()) as { projet: Projet };
        setProjets((prev) => prev.map((p) => (p.id === projet.id ? projet : p)));
      } catch (e) {
        console.error(e);
        setError("La mise à jour n'a pas pu être enregistrée en base.");
      }
    },
    []
  );

  // — Utilisateurs (BF-02) —
  const addUtilisateur = useCallback(async (input: NewUtilisateurInput) => {
    try {
      const res = await fetch("/api/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { utilisateur } = (await res.json()) as { utilisateur: Utilisateur };
      setUtilisateurs((prev) => [...prev, utilisateur].sort((a, b) => a.nom.localeCompare(b.nom)));
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "La création du compte a échoué.");
      return false;
    }
  }, []);

  const setUtilisateurActif = useCallback(async (id: string, actif: boolean) => {
    // Mise à jour optimiste.
    setUtilisateurs((prev) => prev.map((u) => (u.id === id ? { ...u, actif } : u)));
    try {
      const res = await fetch(`/api/utilisateurs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { utilisateur } = (await res.json()) as { utilisateur: Utilisateur };
      setUtilisateurs((prev) => prev.map((u) => (u.id === id ? utilisateur : u)));
    } catch (e) {
      console.error(e);
      // Annulation de la mise à jour optimiste.
      setUtilisateurs((prev) => prev.map((u) => (u.id === id ? { ...u, actif: !actif } : u)));
      setError("La mise à jour du compte n'a pas pu être enregistrée.");
    }
  }, []);

  const setUtilisateurRole = useCallback(
    async (id: string, role: Role) => {
      const snapshot = utilisateurs;
      // Mise à jour optimiste.
      setUtilisateurs((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      try {
        const res = await fetch(`/api/utilisateurs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const { utilisateur } = (await res.json()) as { utilisateur: Utilisateur };
        setUtilisateurs((prev) => prev.map((u) => (u.id === utilisateur.id ? utilisateur : u)));
        return true;
      } catch (e) {
        console.error(e);
        setUtilisateurs(snapshot); // restauration
        setError(e instanceof Error ? e.message : "Le changement de rôle a échoué.");
        return false;
      }
    },
    [utilisateurs]
  );

  const updateUtilisateur = useCallback(async (id: string, input: { nom: string; email: string }) => {
    try {
      const res = await fetch(`/api/utilisateurs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { utilisateur } = (await res.json()) as { utilisateur: Utilisateur };
      setUtilisateurs((prev) =>
        prev.map((u) => (u.id === utilisateur.id ? utilisateur : u)).sort((a, b) => a.nom.localeCompare(b.nom))
      );
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "La modification du compte a échoué.");
      return false;
    }
  }, []);

  const resetMotDePasseUtilisateur = useCallback(async (id: string, motDePasse: string) => {
    try {
      const res = await fetch(`/api/utilisateurs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motDePasse }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "La réinitialisation du mot de passe a échoué.");
      return false;
    }
  }, []);

  const deleteUtilisateur = useCallback(
    async (id: string) => {
      const snapshot = utilisateurs;
      // Suppression optimiste.
      setUtilisateurs((prev) => prev.filter((u) => u.id !== id));
      try {
        const res = await fetch(`/api/utilisateurs/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        return true;
      } catch (e) {
        console.error(e);
        setUtilisateurs(snapshot); // restauration
        setError(e instanceof Error ? e.message : "La suppression du compte a échoué.");
        return false;
      }
    },
    [utilisateurs]
  );

  // — Documents (BF-09) —
  const addDocument = useCallback(async (input: NewDocumentInput) => {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { document } = (await res.json()) as { document: Document };
      setDocuments((prev) => [document, ...prev]);
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "L'enregistrement du document a échoué.");
      return false;
    }
  }, []);

  const updateDocument = useCallback(async (id: string, input: UpdateDocumentInput) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { document } = (await res.json()) as { document: Document };
      setDocuments((prev) => prev.map((d) => (d.id === document.id ? document : d)));
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "La modification du document a échoué.");
      return false;
    }
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    const snapshot = documents;
    // Suppression optimiste.
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error(e);
      setDocuments(snapshot); // restauration
      setError("La suppression du document a échoué.");
    }
  }, [documents]);

  // Alertes recalculées automatiquement à chaque évolution des projets (BF-11).
  const alertes = useMemo(() => computeAlertes(projets), [projets]);

  // Alertes non lues = alertes courantes dont l'id n'a pas été marqué « lu ».
  const alertesNonLues = useMemo(() => {
    const lues = new Set(alertesLues);
    return alertes.filter((a) => !lues.has(a.id));
  }, [alertes, alertesLues]);

  const marquerAlerteLue = useCallback(
    (id: string) => {
      setAlertesLues((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        try {
          localStorage.setItem(ALERTES_LUES_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const marquerToutesAlertesLues = useCallback(() => {
    // On conserve les ids déjà lus + tous les ids d'alertes actuellement actives.
    const ids = Array.from(new Set([...alertesLues, ...alertes.map((a) => a.id)]));
    persistLues(ids);
  }, [alertes, alertesLues, persistLues]);

  return (
    <StoreContext.Provider
      value={{
        projets,
        alertes,
        alertesNonLues,
        utilisateurs,
        documents,
        hydrated,
        error,
        addProjet,
        updateProjet,
        setProjetStatut,
        deleteProjet,
        duplicateProjet,
        updateTacheAvancement,
        addUtilisateur,
        setUtilisateurActif,
        setUtilisateurRole,
        updateUtilisateur,
        resetMotDePasseUtilisateur,
        deleteUtilisateur,
        addDocument,
        updateDocument,
        deleteDocument,
        marquerAlerteLue,
        marquerToutesAlertesLues,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans un StoreProvider");
  return ctx;
}

export function useProjet(id: string) {
  return useStore().projets.find((p) => p.id === id);
}
