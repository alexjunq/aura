# AURA

**Artisan Unique-piece Registry & Accounting** — multi-tenant SaaS for individual
artisans to track pieces, materials, suppliers, sales channels, sales, buyers, and
costs.

- Full spec: [`docs/superpowers/specs/2026-05-18-aura-design.md`](docs/superpowers/specs/2026-05-18-aura-design.md)
- Implementation plan: see the approved plan in `.claude/plans/`.

## Stack

- pnpm workspace · TypeScript strict
- Next.js 15 (App Router) + Auth.js v5
- Postgres 16 + Prisma 6
- MinIO (S3-compatible) for photos
- Node 22 worker for daily commodity price feed
- Docker Compose · Caddy (TLS in prod) · mailhog (dev SMTP)
- Vitest (unit + integration via Testcontainers) · Playwright (E2E, phase 9)

## Quick start

```sh
# 1. Tooling
nvm use                            # Node 22+
corepack enable                    # pnpm via corepack

# 2. Dependencies
pnpm install

# 3. Environment
cp .env.example .env

# 4. Bring up dev infra
docker compose up -d               # postgres, minio, mailhog

# 5. Apply schema
pnpm db:generate
pnpm db:migrate                    # creates a `0_init` migration on first run

# 6. Run the apps
pnpm dev                           # parallel: web (3000) + worker (3001)
```

Open <http://localhost:3000>, MinIO console at <http://localhost:9001>, mailhog UI
at <http://localhost:8025>.

## Layout

```
apps/
  web/                Next.js app — UI and API
  worker/             Node cron runner — daily commodity feed
packages/
  config/             Zod-validated env loader
  db/                 Prisma client + schema + migrations
  domain/             Pure helpers: money/FX, slug, state machine
  email/              EmailProvider interface (Resend / SMTP / Fake impls)
  files/              S3 client + signed URL helpers
  logger/             Shared pino logger
docs/
  superpowers/specs/  Design documents (start here)
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run `web` + `worker` in parallel |
| `pnpm build` | Build every package and app |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit + integration (the latter needs Postgres up) |
| `pnpm test:unit` | Unit only |
| `pnpm test:integration` | Integration only |
| `pnpm db:generate` | Generate Prisma client from `schema.prisma` |
| `pnpm db:migrate` | Apply migrations in dev |
| `pnpm db:reset` | Drop and recreate the dev database |

## Phases

The build is phased; see the implementation plan for full detail.

- **Phase 0 (current)** — scaffold: workspace, packages, healthchecks, CI.
- **Phase 1** — auth & tenancy.
- **Phase 2** — materials & suppliers.
- **Phase 3** — pieces & work sessions (the core).
- **Phase 4** — sales channels.
- **Phase 5** — buyers & interactions.
- **Phase 6** — sales, refund, cost-breakdown view.
- **Phase 7** — worker daily commodity feed.
- **Phase 8** — reports + CSV.
- **Phase 9** — E2E + production deployment hardening.

Every phase ends with shippable, tested code. Tenant isolation is enforced from
Phase 1 and re-verified in every module.
