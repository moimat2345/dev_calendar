# dev_calendar

## Contexte

Web-app **publique et multi-utilisateur** — journal de développement interactif basé sur un calendrier.
Chaque utilisateur se connecte via **GitHub OAuth**, l'app récupère ses repos et commits via l'**API GitHub**, et affiche l'activité sous forme de calendrier mensuel navigable.
Déploiement sur **Vercel + PostgreSQL** (Neon).

**Sécurité** : aucune info sensible dans le repo Git (tokens, secrets, DB credentials → tout en variables d'environnement).

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript |
| Auth | NextAuth.js v5 (Auth.js) — GitHub OAuth |
| Git data | GitHub REST API (Octokit) |
| Base de données | PostgreSQL (Neon) |
| ORM | Prisma |
| Style | Tailwind CSS |

---

## Structure du projet

```
src/
├── app/
│   ├── layout.tsx              # Layout racine (nav, auth provider)
│   ├── page.tsx                # Landing page
│   ├── globals.css
│   ├── login/page.tsx          # Connexion GitHub OAuth
│   ├── dashboard/
│   │   ├── page.tsx            # Calendrier mensuel (protégé)
│   │   ├── day/[date]/page.tsx
│   │   └── project/[slug]/
│   │       ├── page.tsx
│   │       └── day/[date]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── sync/route.ts
│       ├── activity/route.ts
│       ├── day/[date]/route.ts
│       ├── projects/route.ts
│       └── project/[slug]/
│           ├── route.ts
│           └── commits/[date]/route.ts
├── lib/
│   ├── auth.ts                 # Config NextAuth
│   ├── prisma.ts               # Singleton Prisma client
│   ├── github.ts               # Octokit (fetch repos, commits)
│   ├── sync.ts                 # GitHub API → DB
│   ├── types.ts                # Interfaces TypeScript
│   └── utils.ts                # Helpers (dates, slugs)
└── components/
    ├── Calendar.tsx
    ├── CalendarDay.tsx
    ├── MonthNav.tsx
    ├── RepoList.tsx / RepoCard.tsx
    ├── CommitList.tsx / CommitCard.tsx
    ├── ProjectCalendar.tsx
    ├── SyncButton.tsx
    ├── LoginButton.tsx
    └── UserNav.tsx
```

---

## Modèle de données

**User** → githubId, username, avatarUrl, accessToken (chiffré)
**Project** → userId (FK), slug, name, fullName, remoteUrl, defaultBranch, lastSynced
**Commit** → projectId (FK), hash, shortHash, authorName, authorEmail, date, day, message, body, filesChanged, insertions, deletions

---

## Commandes

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npx prisma migrate dev   # Appliquer les migrations DB
npx prisma generate      # Générer le client Prisma
npx prisma studio        # GUI pour explorer la DB
```

---

## Variables d'environnement (.env.local — JAMAIS commité)

```
GITHUB_ID=...              # GitHub OAuth App ID
GITHUB_SECRET=...          # GitHub OAuth App Secret
NEXTAUTH_SECRET=...        # Secret pour signer les JWT
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=...           # Connection string PostgreSQL (Neon)
```

---

## Design

**"Terminal meets editorial"** :
- Fond quasi-noir (#0a0a0f), accents cyan (#00ffcc) et vert (#22c55e)
- Typo mono pour titres, sans-serif pour body
- Heatmap calendrier (gradient noir → cyan/vert)
- Commit cards style terminal, expand avec animation

---

## Sécurité

- `.env.local` dans `.gitignore`
- Toutes les routes API vérifient `getServerSession()`
- Requêtes DB filtrées par `userId`
- Prisma = prepared statements (pas d'injection SQL possible)
- CSRF protection via NextAuth
- Pas de secrets hardcodés

---

## Navigation

```
/ → Landing (non connecté)
/dashboard → Calendrier mensuel
/dashboard/day/[date] → Repos modifiés ce jour
/dashboard/project/[slug] → Calendrier du projet
/dashboard/project/[slug]/day/[date] → Commits du jour (expandable)
```

---

## Extensibilité future

- Spotify : table ActivityMetadata
- Stats : page /dashboard/stats
- VS Code : endpoint dédié
- Repos locaux : CLI/agent local
