"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Plus,
  Menu,
  LogOut,
  Clock,
  CircleDollarSign,
  TriangleAlert,
  CircleCheck,
  Check,
  ArrowRight,
  MapPin,
  FileText,
  User,
  type LucideIcon,
} from "lucide-react";
import { ROLE_LABEL, PROJECT_TYPE_LABEL, STATUS } from "@/lib/status";
import type { Role, DocumentType } from "@/lib/types";

// Libellés des types de document (cohérents avec la page /documents).
const DOC_LABEL: Record<DocumentType, string> = {
  pv: "Procès-verbal",
  os: "Ordre de service",
  plan: "Plan / étude",
  photo: "Photo de chantier",
  rapport: "Rapport",
};
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import { MobileNav } from "./MobileNav";

// Présentation des alertes par type (cohérente avec la page /alertes).
const ALERTE_TYPE: Record<string, { label: string; icon: LucideIcon }> = {
  retard: { label: "Retard", icon: Clock },
  budget: { label: "Dépassement budgétaire", icon: CircleDollarSign },
  incident: { label: "Incident", icon: TriangleAlert },
};

export function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const { user, logout } = useAuth();
  const { alertesNonLues, projets, documents, utilisateurs, marquerAlerteLue, marquerToutesAlertesLues } = useStore();

  const getProjet = (id: string) => projets.find((p) => p.id === id);
  const count = alertesNonLues.length;
  const isSuperAdmin = user?.role === "super-admin";

  // Recherche multi-catégories : projets, documents et (pour le super-admin) utilisateurs.
  const q = query.trim().toLowerCase();
  const match = (...champs: (string | undefined)[]) =>
    champs.filter(Boolean).some((c) => c!.toLowerCase().includes(q));

  const projetHits = q
    ? projets.filter((p) => match(p.intitule, p.region, p.moa, p.lot, PROJECT_TYPE_LABEL[p.type])).slice(0, 5)
    : [];
  const docHits = q
    ? documents.filter((d) => match(d.nom, DOC_LABEL[d.type], getProjet(d.projetId)?.intitule)).slice(0, 4)
    : [];
  const userHits = q && isSuperAdmin
    ? utilisateurs.filter((u) => match(u.nom, u.email, ROLE_LABEL[u.role])).slice(0, 4)
    : [];

  // Liste à plat (ordre d'affichage) pour la navigation clavier.
  const flat: { href: string }[] = [
    ...projetHits.map((p) => ({ href: `/projets/${p.id}` })),
    ...docHits.map(() => ({ href: "/documents" })),
    ...userHits.map(() => ({ href: "/utilisateurs" })),
  ];
  const total = flat.length;
  const activeIndex = total > 0 ? Math.min(active, total - 1) : 0;
  // Offsets de chaque groupe dans la liste à plat.
  const docOffset = projetHits.length;
  const userOffset = projetHits.length + docHits.length;

  function go(href: string) {
    setSearchOpen(false);
    setQuery("");
    setActive(0);
    router.push(href);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchOpen(true);
      setActive((i) => Math.min(total - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    }
  }

  // Maintient l'élément surligné visible lors de la navigation clavier.
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, searchOpen]);

  // Fermeture des menus (notifications, recherche) au clic extérieur ou via Échap.
  useEffect(() => {
    if (!notifOpen && !searchOpen) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen, searchOpen]);

  const initiales = user
    ? user.nom.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const roleLabel = user ? ROLE_LABEL[user.role as Role] ?? user.role : "";

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:gap-4 sm:px-5">
        {/* Burger — navigation mobile (< lg) */}
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line text-slate hover:bg-surface lg:hidden"
        >
          <Menu size={18} aria-hidden />
        </button>

        <h1 className="truncate text-lg">{title}</h1>

        <div className="relative ml-auto hidden md:block" ref={searchRef}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (total > 0) go(flat[activeIndex].href);
            }}
            className="flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 focus-within:border-brand-interactive"
          >
            <Search size={16} className="text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
                setActive(0);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Rechercher un projet, un document…"
              aria-label="Rechercher"
              aria-expanded={searchOpen && q.length > 0}
              className="w-44 bg-transparent text-sm outline-none placeholder:text-muted lg:w-56"
            />
          </form>

          {searchOpen && q.length > 0 && (
            <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-card border border-line bg-white shadow-lg">
              {total === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">
                  Aucun résultat pour «&nbsp;{query.trim()}&nbsp;».
                </p>
              ) : (
                <>
                  {/* Projets */}
                  {projetHits.length > 0 && (
                    <SearchGroup label="Projets">
                      {projetHits.map((p, i) => {
                        const s = STATUS[p.statut];
                        const idx = i;
                        return (
                          <SearchItem
                            key={p.id}
                            active={idx === activeIndex}
                            activeRef={idx === activeIndex ? activeItemRef : undefined}
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => go(`/projets/${p.id}`)}
                          >
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">{p.intitule}</span>
                              <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                                <MapPin size={12} aria-hidden /> {p.region} · {p.moa} · {PROJECT_TYPE_LABEL[p.type]}
                              </span>
                            </span>
                            <span className={`shrink-0 text-xs font-medium ${s.text}`}>{s.label}</span>
                          </SearchItem>
                        );
                      })}
                    </SearchGroup>
                  )}

                  {/* Documents */}
                  {docHits.length > 0 && (
                    <SearchGroup label="Documents">
                      {docHits.map((d, i) => {
                        const idx = docOffset + i;
                        const projet = getProjet(d.projetId);
                        return (
                          <SearchItem
                            key={d.id}
                            active={idx === activeIndex}
                            activeRef={idx === activeIndex ? activeItemRef : undefined}
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => go("/documents")}
                          >
                            <FileText size={16} className="mt-0.5 shrink-0 text-brand-interactive" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">{d.nom}</span>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {DOC_LABEL[d.type]}
                                {projet ? ` · ${projet.intitule}` : ""}
                              </span>
                            </span>
                          </SearchItem>
                        );
                      })}
                    </SearchGroup>
                  )}

                  {/* Utilisateurs (super-admin) */}
                  {userHits.length > 0 && (
                    <SearchGroup label="Utilisateurs">
                      {userHits.map((u, i) => {
                        const idx = userOffset + i;
                        return (
                          <SearchItem
                            key={u.id}
                            active={idx === activeIndex}
                            activeRef={idx === activeIndex ? activeItemRef : undefined}
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => go("/utilisateurs")}
                          >
                            <User size={16} className="mt-0.5 shrink-0 text-brand-interactive" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">{u.nom}</span>
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {ROLE_LABEL[u.role]} · {u.email}
                              </span>
                            </span>
                            {!u.actif && <span className="shrink-0 text-xs text-muted">Inactif</span>}
                          </SearchItem>
                        );
                      })}
                    </SearchGroup>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <Link href="/projets/nouveau" className="btn btn-accent hidden px-3 sm:inline-flex">
          <Plus size={16} aria-hidden /> Nouveau projet
        </Link>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            aria-label={count > 0 ? `Notifications (${count} alerte${count > 1 ? "s" : ""})` : "Notifications"}
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line text-slate hover:bg-surface"
          >
            <Bell size={18} aria-hidden />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-state-late px-1 text-[10px] font-semibold leading-none text-white">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-card border border-line bg-white shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <span className="text-sm font-semibold text-ink">Notifications</span>
                {count > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-state-late/10 px-2 py-0.5 text-xs font-medium text-state-late">
                      {count} active{count > 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={marquerToutesAlertesLues}
                      title="Marquer toutes les notifications comme lues"
                      className="text-xs font-medium text-brand-interactive hover:underline"
                    >
                      Tout lire
                    </button>
                  </div>
                )}
              </div>

              {count === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <CircleCheck size={24} className="text-state-ontime" aria-hidden />
                  <p className="text-sm font-medium text-ink">Aucune alerte active</p>
                  <p className="text-xs text-muted">Tous les projets sont dans les délais et le budget.</p>
                </div>
              ) : (
                <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                  {alertesNonLues.slice(0, 6).map((a) => {
                    const t = ALERTE_TYPE[a.type];
                    const Icon = t.icon;
                    const projet = getProjet(a.projetId);
                    const isLate = a.severite === "late";
                    return (
                      <li key={a.id} className="flex items-stretch hover:bg-surface">
                        <Link
                          href={projet ? `/projets/${projet.id}` : "/alertes"}
                          onClick={() => {
                            marquerAlerteLue(a.id);
                            setNotifOpen(false);
                          }}
                          className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3"
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
                              isLate ? "bg-state-late/10 text-state-late" : "bg-state-risk/10 text-state-risk"
                            }`}
                          >
                            <Icon size={15} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">{t.label}</span>
                            <span className="mt-0.5 line-clamp-2 block text-xs text-slate">{a.message}</span>
                            {projet && (
                              <span className="mt-0.5 block truncate text-xs text-muted">{projet.intitule}</span>
                            )}
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => marquerAlerteLue(a.id)}
                          aria-label="Marquer cette notification comme lue"
                          title="Marquer comme lue"
                          className="flex w-10 shrink-0 items-center justify-center text-muted hover:text-state-ontime"
                        >
                          <Check size={16} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Link
                href="/alertes"
                onClick={() => setNotifOpen(false)}
                className="flex items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-sm font-medium text-brand-interactive hover:bg-surface"
              >
                Voir toutes les alertes <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-l border-line pl-3 sm:pl-4">
          <Link
            href="/profil"
            title="Mon profil"
            className="flex items-center gap-3 rounded-control p-1 hover:bg-surface"
          >
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink">{user?.nom ?? "—"}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {initiales}
            </div>
          </Link>
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line text-slate hover:bg-surface hover:text-state-late"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </header>

      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  );
}

// Groupe de résultats de recherche (en-tête + liste).
function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <ul className="pb-1">{children}</ul>
    </div>
  );
}

// Ligne de résultat — surlignée si active (clavier ou survol).
function SearchItem({
  active,
  activeRef,
  onMouseEnter,
  onClick,
  children,
}: {
  active: boolean;
  activeRef?: React.Ref<HTMLButtonElement>;
  onMouseEnter: () => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        ref={activeRef}
        type="button"
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        className={`flex w-full items-start gap-3 px-4 py-2.5 text-left ${active ? "bg-surface" : "hover:bg-surface"}`}
      >
        {children}
      </button>
    </li>
  );
}
