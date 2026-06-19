import Link from "next/link";
import {
  ArrowRight,
  LogIn,
  MapPin,
  WifiOff,
  Bell,
  FileText,
  BarChart3,
  ShieldCheck,
  FolderKanban,
  Map as MapIcon,
  TrendingUp,
  CheckCircle2,
  Check,
  Building2,
  Mail,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { ContactForm } from "@/components/ContactForm";
import { ScrollToTop } from "@/components/ScrollToTop";

// Page d'accueil publique (vitrine) — présentée avant la connexion.
// Reprend le positionnement du cahier des charges et applique la charte graphique.

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: FolderKanban, title: "Référentiel des projets", desc: "Centralisez projets, lots et chantiers dans une base unique et fiable." },
  { icon: TrendingUp, title: "Avancement & budget", desc: "Suivez l'avancement physique et financier au regard du planning prévisionnel." },
  { icon: WifiOff, title: "Terrain hors-ligne", desc: "Saisie de rapports et photos sans réseau, puis synchronisation différée." },
  { icon: MapIcon, title: "Cartographie", desc: "Visualisez l'ensemble du portefeuille géolocalisé sur une carte interactive." },
  { icon: Bell, title: "Alertes automatiques", desc: "Soyez prévenu des retards, dépassements budgétaires et incidents." },
  { icon: FileText, title: "Gestion documentaire", desc: "Ordres de service, PV, plans et photos classés et archivés par projet." },
  { icon: BarChart3, title: "Tableaux de bord", desc: "Indicateurs consolidés par projet, région et catégorie d'ouvrage." },
  { icon: ShieldCheck, title: "Sécurité & traçabilité", desc: "Accès par rôle et journal d'audit horodaté de chaque action." },
];

const ACTEURS = [
  "Maître d'ouvrage (MOA)",
  "Maître d'œuvre",
  "Chef de chantier",
  "Bureau de contrôle",
  "Décideur / Bailleur",
  "Administrateur",
];

const STATS = [
  { value: "100 %", label: "Avancement traçable et géolocalisé" },
  { value: "Temps réel", label: "Remontée d'information du chantier" },
  { value: "Hors-ligne", label: "Utilisable en connectivité dégradée" },
];

// Offres tarifaires (montants indicatifs en FCFA, cf. cahier des charges §12).
interface Plan {
  nom: string;
  prix: string;
  unite?: string;
  cible: string;
  populaire?: boolean;
  features: string[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    nom: "Essentiel",
    prix: "75 000",
    unite: "FCFA / mois",
    cible: "Petites entreprises et PME du BTP",
    features: [
      "Jusqu'à 5 projets actifs",
      "Suivi avancement & budget",
      "Application mobile de terrain",
      "Tableaux de bord standard",
      "Support par e-mail",
    ],
    cta: "Démarrer",
  },
  {
    nom: "Professionnel",
    prix: "250 000",
    unite: "FCFA / mois",
    cible: "Bureaux d'études et maîtres d'œuvre",
    populaire: true,
    features: [
      "Projets illimités",
      "Mode hors-ligne & synchronisation",
      "Alertes automatiques & cartographie",
      "Gestion documentaire avancée",
      "Rapports PDF & export",
      "Support prioritaire",
    ],
    cta: "Choisir Pro",
  },
  {
    nom: "Administration",
    prix: "Sur devis",
    cible: "Ministères, collectivités et bailleurs",
    features: [
      "Déploiement à l'échelle nationale",
      "Hébergement dédié / sur site",
      "Rôles & droits personnalisés",
      "Intégrations sur mesure",
      "Formation des utilisateurs",
      "Accompagnement dédié",
    ],
    cta: "Nous contacter",
  },
];

const CONTACTS = [
  { icon: Mail, label: "E-mail", value: "support@kamer-center.net", href: "mailto:support@kamer-center.net" },
  { icon: Phone, label: "Téléphone", value: "+237 6 00 00 00 00", href: "tel:+237600000000" },
  { icon: Building2, label: "Adresse", value: "Yaoundé, Cameroun", href: undefined },
];

// Maîtres d'ouvrage publics référents (acronymes ministériels) — bandeau de confiance.
const MOA_PUBLICS = ["MINTP", "MINEE", "MINHDU", "MINSANTE", "MINDCAF"];

// Liens du pied de page institutionnel.
const FOOTER_LINKS: { titre: string; liens: { label: string; href: string }[] }[] = [
  {
    titre: "Plateforme",
    liens: [
      { label: "Tableau de bord", href: "/dashboard" },
      { label: "Cartographie", href: "/carte" },
      { label: "Projets", href: "/projets" },
      { label: "Se connecter", href: "/connexion" },
    ],
  },
  {
    titre: "Ressources",
    liens: [
      { label: "Fonctionnalités", href: "#fonctionnalites" },
      { label: "Tarifs", href: "#tarifs" },
      { label: "Contact", href: "#contact" },
    ],
  },
];

// Intitulé de section institutionnel : surtitre (filet + label) puis titre.
function SectionTitle({
  eyebrow,
  title,
  desc,
  center = true,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p
        className={
          "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-interactive" +
          (center ? " justify-center" : "")
        }
      >
        <span className="h-px w-6 bg-brand-interactive/50" /> {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl">{title}</h2>
      {desc && <p className="mt-3 text-slate">{desc}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* En-tête public */}
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo size={34} />
          <nav className="flex items-center gap-3">
            <a href="#tarifs" className="hidden text-sm font-medium text-slate hover:text-brand md:inline">
              Tarifs
            </a>
            <a href="#contact" className="hidden text-sm font-medium text-slate hover:text-brand md:inline">
              Contact
            </a>
            <Link href="/connexion" className="hidden text-sm font-medium text-slate hover:text-brand sm:inline">
              Se connecter
            </Link>
            <Link href="/dashboard" className="btn btn-primary px-4">
              Accéder à la plateforme <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand text-white">
        <div
          className="animate-soft-drift absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="animate-soft-rise text-white" style={{ fontSize: "40px", lineHeight: 1.1 }}>
              Suivez la piste de vos projets d&apos;infrastructures
            </h1>
            <p className="animate-soft-rise delay-1 mt-4 max-w-xl text-lg text-white/80">
              TREKKA est la plateforme numérique de monitoring qui centralise, fiabilise et
              géolocalise le suivi des chantiers — du lancement à la réception.
            </p>
            <div className="animate-soft-rise delay-2 mt-8 flex flex-wrap gap-3">
              <Link href="/connexion" className="btn btn-accent px-5">
                <LogIn size={18} /> Se connecter
              </Link>
              <Link href="/dashboard" className="btn px-5 border border-white/30 text-white hover:bg-white/10">
                Découvrir le tableau de bord <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Aperçu carte projet (clin d'œil à la charte §5.2) */}
          <div className="animate-soft-rise delay-3 relative">
            <div className="animate-soft-float rounded-card bg-white p-5 text-ink shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 className="leading-snug">Réhabilitation route Douala–Yaoundé</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-state-risk/10 px-2.5 py-1 text-xs font-medium text-state-risk">
                  <span className="h-1.5 w-1.5 rounded-full bg-state-risk" /> À risque
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <MapPin size={13} /> Littoral · MINTP · Lot 3
              </p>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate">Avancement</span>
                  <span className="kpi">64%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand-interactive" style={{ width: "64%" }} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-control bg-surface p-3">
                  <p className="text-xs text-muted">Délai restant</p>
                  <p className="kpi text-lg text-state-late">18 jours</p>
                </div>
                <div className="rounded-control bg-surface p-3">
                  <p className="text-xs text-muted">Budget consommé</p>
                  <p className="kpi text-lg text-state-late">78%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau de confiance — maîtres d'ouvrage publics */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-7">
          <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Au service des maîtres d&apos;ouvrage publics
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-9 gap-y-3">
            {MOA_PUBLICS.map((m) => (
              <span key={m} className="font-heading text-base font-semibold tracking-wide text-slate/60">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Bandeau statistiques */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-y-6 px-5 py-10 sm:grid-cols-3 sm:divide-x sm:divide-line">
          {STATS.map((s) => (
            <div key={s.label} className="px-4 text-center">
              <p className="font-heading text-3xl font-semibold text-brand">{s.value}</p>
              <p className="mt-1.5 text-sm text-slate">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problématique */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <SectionTitle
          eyebrow="Le constat"
          title="Pourquoi TREKKA ?"
          desc="Le suivi des chantiers repose encore largement sur le papier, des tableurs isolés et des échanges informels : visibilité tardive, faible traçabilité, dérives de délais et de coûts, manque de transparence. TREKKA y répond par un outil intégré, pensé pour le contexte camerounais et les contraintes de terrain."
        />
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="scroll-mt-20 bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle
            eyebrow="Fonctionnalités"
            title="Une plateforme complète"
            desc="Tout le pilotage d'un projet d'infrastructure, du terrain à la décision."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-interactive/40 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-control bg-brand-interactive/10 text-brand-interactive">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Acteurs */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionTitle
              eyebrow="Gouvernance"
              title="Pensé pour chaque acteur"
              desc="Des rôles adaptés à la chaîne de valeur du BTP : chacun accède à l'information utile à son niveau, du chantier jusqu'aux instances de décision."
              center={false}
            />
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {ACTEURS.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-ink">
                  <CheckCircle2 size={18} className="text-state-ontime" /> {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-gradient-to-br from-brand/5 to-brand-interactive/10 p-8 text-center">
            <LogoMark size={64} className="mx-auto" />
            <p className="mt-5 font-heading text-lg text-brand">Transparence & aide à la décision</p>
            <p className="mt-2 text-sm text-slate">
              Une vision unifiée, fiable et géolocalisée de l&apos;ensemble du portefeuille de projets.
            </p>
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="scroll-mt-20 bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle
            eyebrow="Tarifs"
            title="Des offres adaptées à chaque structure"
            desc="Tarifs indicatifs en francs CFA. Le recours à des technologies open source maîtrise les coûts ; l'essentiel porte sur l'hébergement et l'accompagnement."
          />

          <div className="mt-10 grid items-start gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.nom}
                className={
                  "card relative flex flex-col p-6 " +
                  (plan.populaire ? "border-brand-interactive ring-2 ring-brand-interactive/30" : "")
                }
              >
                {plan.populaire && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-amber px-3 py-1 text-xs font-medium text-accentText">
                    Le plus choisi
                  </span>
                )}
                <h3 className="font-heading text-lg">{plan.nom}</h3>
                <p className="mt-1 text-sm text-muted">{plan.cible}</p>

                <div className="mt-4">
                  <span className="font-heading text-3xl font-semibold text-ink">{plan.prix}</span>
                  {plan.unite && <span className="ml-1 text-sm text-muted">{plan.unite}</span>}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate">
                      <Check size={16} className="mt-0.5 shrink-0 text-state-ontime" /> {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={"btn mt-6 w-full " + (plan.populaire ? "btn-primary" : "btn-secondary")}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted">
            Tarifs hors taxes, susceptibles d&apos;évoluer. Remises possibles pour les déploiements pluriannuels.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionTitle
                eyebrow="Contact"
                title="Parlons de votre projet"
                desc="Une question, une démonstration ou un déploiement à l'échelle d'une administration ? Notre équipe vous répond."
                center={false}
              />
              <ul className="mt-6 space-y-4">
                {CONTACTS.map((c) => {
                  const Icon = c.icon;
                  const content = (
                    <span className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-control bg-brand-interactive/10 text-brand-interactive">
                        <Icon size={20} />
                      </span>
                      <span>
                        <span className="block text-xs uppercase tracking-wide text-muted">{c.label}</span>
                        <span className="text-sm font-medium text-ink">{c.value}</span>
                      </span>
                    </span>
                  );
                  return (
                    <li key={c.label}>
                      {c.href ? (
                        <a href={c.href} className="inline-block hover:opacity-80">{content}</a>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Formulaire de contact — enregistrement réel via POST /api/contact */}
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="relative overflow-hidden bg-brand">
        <div
          className="animate-soft-drift absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-16 text-center text-white">
          <h2 className="text-2xl text-white">Prêt à reprendre le contrôle de vos chantiers&nbsp;?</h2>
          <p className="max-w-xl text-white/80">
            Connectez-vous à TREKKA et suivez l&apos;avancement de vos projets d&apos;infrastructures en temps réel.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/connexion" className="btn btn-accent px-6">
              <LogIn size={18} /> Se connecter
            </Link>
            <Link href="/dashboard" className="btn px-6 border border-white/30 text-white hover:bg-white/10">
              Voir une démonstration <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Pied de page institutionnel */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {/* Marque + signature */}
            <div className="lg:col-span-2">
              <Logo size={32} />
              <p className="mt-4 max-w-sm text-sm text-slate">
                Plateforme numérique de monitoring des projets d&apos;infrastructures du BTP,
                pensée pour les maîtres d&apos;ouvrage publics et le contexte camerounais.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate">
                <li className="flex items-center gap-2">
                  <Mail size={15} className="text-muted" /> support@kamer-center.net
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={15} className="text-muted" /> +237 6 00 00 00 00
                </li>
              </ul>
            </div>

            {/* Colonnes de liens */}
            {FOOTER_LINKS.map((col) => (
              <div key={col.titre}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">{col.titre}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.liens.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-slate transition-colors hover:text-brand-interactive">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Barre légale */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} TREKKA · Monitoring des infrastructures BTP · Cameroun</p>
            <p>Tous droits réservés · Conçu pour le terrain et la décision publique</p>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
