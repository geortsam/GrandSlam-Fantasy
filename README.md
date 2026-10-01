# GrandSlam Fantasy

Fantasy tennis for the ATP and WTA tours. Create leagues, draft real players under a salary cap, set rosters for every Grand Slam and Masters 1000, and follow leaderboards that update live as matches are played.

![Head-to-head league](docs/screenshots/h2h.png)

## Features

- **Dual tour.** ATP, WTA and Mixed Tour leagues, with an ATP / WTA / Mixed toggle across players and tournaments.
- **Game modes.** Single-tournament leagues, or season-long leagues scored by Points Only or Head-to-Head (round-robin, one matchup per tournament).
- **Public and private leagues** with invite links (`/join/CODE`), invite codes and optional passcodes (bcrypt-hashed).
- **Salary cap draft.** Each player's price is set by ranking and recent form (`src/lib/domain/salary.ts`). Players keep the price they were bought at.
- **Roster rules.** 8 players: 2 captains (1.5x), 4 starters, 2 bench. Mixed rosters start 2 ATP + 2 WTA and name one captain per tour; at single-tour events a mixed league plays that tour only.
- **Lockout.** Transfers and captain changes freeze at the tournament start time, enforced server-side, with a live countdown in the roster builder.
- **Scoring engine** (`src/lib/domain/scoring.ts`): win +10, straight sets +5, ace +0.5, double fault -0.5, break point converted +2, and tiered upset bonuses for beating a better seed (top-4 seed +10, top-8 +7, top-16 +5, any seed +3). Running stats score live; win bonuses land when the match ends.
- **Live updates.** A cron route polls scores, rescoring only matches still in play, then bumps a cache generation in Redis so every leaderboard refreshes. The UI polls with TanStack Query (15s while live).
- **Player database.** Rankings, ranking points, hard/clay/grass win %, season W-L, form guide and current tournament.
- **Dark and light mode**, mobile-first layouts, WCAG AA contrast checked in tests.

## Stack

Next.js 15 (App Router, RSC, TypeScript) · Tailwind CSS with shadcn-style components · Lucide icons · PostgreSQL + Prisma · NextAuth (GitHub, Google, email magic link, optional demo login) · TanStack Query · Redis / Vercel KV (falls back to in-memory) · Vitest.

## Getting started

Requires Node 20.9+ (22 recommended), PostgreSQL and optionally Redis.

```bash
cp .env.example .env          # then fill in DATABASE_URL and NEXTAUTH_SECRET
npm install
npx prisma migrate deploy     # or: npm run db:migrate
npm run db:seed               # syncs the season and creates demo leagues
npm run dev
```

Open http://localhost:3000 and use **Continue with demo account** (enabled by `ENABLE_DEMO_LOGIN=true`). `demo@grandslam.local` owns three seeded leagues with a season of history.

## Tennis data

The app talks to providers through `TennisDataProvider` (`src/lib/tennis/provider.ts`).

| `TENNIS_PROVIDER` | What it does |
| --- | --- |
| `mock` (default) | Deterministic simulation of the 2026 Grand Slam and Masters 1000 calendar with 48 players per tour. Draws and match stats are seeded, and matches move from scheduled to live to final against the real clock, so live scoring works with no API key. Player names are real; rankings and records are approximate demo data. |
| `sportradar` | Sportradar Tennis v3 adapter (`SPORTRADAR_API_KEY`). The field mapping follows Sportradar's published schema but has not been run against a live key yet, so verify it with your plan before switching. |

Adding RapidAPI or another feed means implementing the four provider methods.

### Sync jobs

| Route | Schedule (`vercel.json`) | Purpose |
| --- | --- | --- |
| `GET /api/cron/live` | every minute | Refresh tournament status and rescore live matches |
| `GET /api/cron/sync` | daily 04:00 UTC | Rankings, salaries, calendar and draws for the next 14 days |

Both require `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends automatically. Locally: `npm run sync` (full) or `npm run sync -- --live`.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: scoring, salary, roster rules, standings, lockout, mock provider, colour contrast |
| `npm run build` | Prisma generate + production build |

## Design tokens

The court palette lives in `src/app/globals.css` as CSS variables: Grass Green (primary), Hardcourt Blue (secondary) and Clay Orange (accent), with light and dark values. No Figma file was available when this was built, so the tokens were derived from those three court colours; swap the HSL values to match a Figma library. `tests/contrast.test.ts` fails the build if any text/background pair drops below 4.5:1.

## Deploying

Vercel works out of the box: set the environment variables from `.env.example`, point `DATABASE_URL` at a hosted Postgres (Neon, Supabase, RDS), add Vercel KV or Upstash Redis as `REDIS_URL`/`KV_URL`, run `npm run db:deploy` once, and the crons in `vercel.json` start polling. Keep `ENABLE_DEMO_LOGIN=false` in production.

## Project layout

```
prisma/              schema, migrations, seed
src/app/             pages and API routes
src/components/      UI (shadcn-style primitives in components/ui)
src/lib/domain/      pure game logic: scoring, salary, roster rules, standings, lockout
src/lib/tennis/      provider interface, mock provider, Sportradar adapter
src/lib/sync.ts      provider -> database sync and scoring
src/lib/leagues.ts   leagues, rosters, leaderboards
tests/               Vitest suites
```
