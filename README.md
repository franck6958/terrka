# TREKKA

Système numérique de **monitoring des projets d'infrastructures du BTP au Cameroun**.
Plateforme web (Next.js) construite d'après le **cahier des charges** et la **charte graphique** TREKKA.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** — tokens issus de la charte (couleurs, typographie, rayons)
- **lucide-react** — iconographie (style linéaire, conforme charte §6)
- Polices **Poppins** (titres/logo) et **Inter** (texte/interface) via `next/font`

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner DATABASE_URL (Neon) et AUTH_SECRET
npm run dev                  # http://localhost:3000
npm run build                # build de production
```

### Base de données (Neon / PostgreSQL)

Les données sont persistées dans une base Neon. Une fois `DATABASE_URL`
renseignée dans `.env.local` :

```bash
# Initialise le schéma + le jeu de démonstration (idempotent) :
curl -X POST http://localhost:3000/api/seed
```

Le schéma de référence est dans [`db/schema.sql`](db/schema.sql). L'accès aux
données est centralisé côté serveur dans `src/lib/queries.ts` ; le front charge
son état initial via `GET /api/bootstrap` et mute via `POST /api/projets` et
`PATCH /api/projets/[id]/taches/[tacheId]`.

### Authentification (BF-01) & rôles (BF-02)

Connexion par e-mail + mot de passe validée contre la table `utilisateurs`
(hachage **PBKDF2**, session par **cookie signé HMAC**). Les routes applicatives
sont protégées par `src/middleware.ts` ; l'accès à certains modules est restreint
par rôle (`src/lib/rbac.ts` — ex. `/utilisateurs` réservé au super-admin).

Après le seed, tous les comptes de démonstration partagent le mot de passe
**`trekka2026`**. Exemples :

| Rôle | E-mail |
|------|--------|
| Super-administrateur | `admin@trekka.cm` |
| Maître d'ouvrage | `moa@mintp.cm` |
| Maître d'œuvre | `p.mbarga@trekka.cm` |
| Bureau de contrôle | `controle@trekka.cm` |
| Bailleur | `suivi@bailleur.org` |

## Pages

| Route | Module (cahier des charges) |
|-------|------------------------------|
| `/` | Tableau de bord — KPI consolidés, alertes, avancement (BF-12) |
| `/projets` · `/projets/[id]` | Référentiel projets, avancement physique & financier (BF-03/05/06) |
| `/carte` | Cartographie des chantiers géolocalisés (BF-10) |
| `/alertes` | Alertes retard / budget / incident (BF-11) |
| `/documents` | Gestion documentaire (BF-09) |
| `/rapports` | Indicateurs consolidés & export PDF (BF-12/13) |
| `/utilisateurs` | Comptes, rôles et droits (BF-02) |
| `/journal` | Journal d'audit horodaté (BF-15 / BNF-09) |
| `/connexion` | Authentification par rôle (BF-01) |

## Design system

Tokens dans `tailwind.config.ts` (palette de marque, neutres « béton & acier »,
couleurs d'état). Les états sont **toujours** doublés d'un libellé + icône
(accessibilité, charte §6). Composants réutilisables dans `src/components/`
(`Logo`, `StatusBadge`, `ProgressBar`, `ProjectCard`, `KpiCard`, `Sidebar`, `Topbar`).

> Données de démonstration mockées dans `src/lib/data.ts`. Backend/API REST,
> mobile hors-ligne et PostGIS/Leaflet relèvent des phases ultérieures du projet.
