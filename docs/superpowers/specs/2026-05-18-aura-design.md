# AURA — Artisan Unique-piece Registry & Accounting

**Status:** Draft for review
**Date:** 2026-05-18
**Author:** alexjunq@gmail.com (with Claude)

## 1. Purpose

AURA is a multi-tenant SaaS that helps individual artists run the business side of making and selling one-of-a-kind pieces. Each artist signs up, gets their own tenant, and tracks: the pieces they create (with materials and time), the suppliers they buy from, current material prices (manual, commodity feed, and per-supplier price lists), sales channels, individual piece inventory and location, buyers (with interaction history), and a live cost breakdown per piece to inform pricing decisions.

## 2. Goals and Non-Goals

**Goals**
- One signup → fully usable workspace for an artist.
- All eight modules (pieces, materials, suppliers, channels, sales, buyers, pricing-view, reports) shipped together in v1.
- Tenant data is strictly isolated; one tenant cannot read or write another's rows.
- A piece's *historical* cost is stable even when material prices change later.
- The full piece lifecycle (`in_progress → in_studio → reserved/on_sale → sold/returned/lost_damaged`) is auditable.
- Self-hostable on a single VPS via Docker Compose.

**Non-goals (v1)** — see §11.

## 3. High-Level Architecture

Single Docker Compose stack, four services:

```
caddy ──┬─▶ web (Next.js, next start)  ─┐
        │                                ├─▶ postgres:16
        └─▶ /photos/* via signed URLs    ├─▶ minio (S3-compatible)
                                         │
            worker (Node + node-cron) ───┘
```

- **caddy** — TLS termination (Let's Encrypt), reverse proxy.
- **web** — Next.js App Router app. Serves UI + API. Stateless.
- **worker** — Long-running Node process running `node-cron`. Handles the daily commodity price feed. Shares packages with `web`.
- **postgres** — Single Postgres 16. Daily `pg_dump` to host-bound `/backups`.
- **minio** — S3-compatible object storage for piece photos.

**Repo layout** — pnpm workspace.

```
apps/
  web/        # Next.js
  worker/     # Node cron runner
packages/
  db/         # Prisma client + migrations (shared)
  domain/     # pure types + state machine + money/FX helpers
  email/      # transactional email interface + Resend impl
  files/      # S3/MinIO client + signed URL helpers
  config/     # Zod-validated env loader
```

**Module layout inside `apps/web/src/modules/<name>/`**
- `schema.ts` — Zod input/output schemas. One source of truth, imported by routes and React forms.
- `repo.ts` — Only file that calls Prisma. Every function takes `tenantId` as its first argument.
- `service.ts` — Public surface. Business logic, orchestration, transactions. The only thing routes import.
- `__tests__/` — Vitest specs.

**Multi-tenancy** — single Postgres database, shared schema, every domain table has `tenant_id`. Code-enforced isolation: only the repo layer issues Prisma calls, every repo function requires `tenantId`, and middleware resolves it from the session once per request. (RLS is a possible future hardening, not v1.)

## 4. Data Model

`tenant_id` is implicit on every domain table below — not repeated.

### 4.1 Auth & tenancy
- **`tenant`** — `id`, `name`, `base_currency` (ISO 4217), `hourly_labor_rate` (decimal, base_currency), `created_at`.
- **`user`** — `id`, `tenant_id`, `email` (unique per tenant), `name`, `hashed_password` (nullable), `email_verified_at`, `created_at`.
- **`account`**, **`session`**, **`verification_token`** — NextAuth-owned, standard schema.
- v1 invariant: one user per tenant. Schema permits N:1; signup enforces 1:1.

### 4.2 Materials
- **`material`** — `id`, `name`, `unit` (g, ct, mm, piece, m, …), `kind` (`commodity` | `gemstone` | `wood` | `other`), `commodity_symbol` (nullable; e.g. `XAU`, `XAG`, `XPT` when `kind='commodity'`), `notes`, `last_feed_fetched_at` (nullable).
- **`material_price`** — `id`, `material_id`, `source` (`manual` | `feed` | `supplier`), `supplier_id` (nullable), `price_per_unit` (decimal), `currency` (ISO), `fx_rate_to_base` (decimal, captured at write time), `effective_at`, `created_by_user_id`.
- "Current price" is the latest `material_price` row per `(material_id, source, supplier_id)` at-or-before now. No mutation of past rows.

### 4.3 Suppliers
- **`supplier`** — `id`, `name`, `contact_name`, `email`, `phone`, `website`, `address` (jsonb), `notes`, `active` (bool).
- **`supplier_material`** — junction: `supplier_id`, `material_id`, `sku`, `default_lead_time_days`.
- Supplier prices live in `material_price` with `source='supplier'`.

### 4.4 Pieces
- **`piece`** — `id`, `title`, `slug` (unique per tenant), `description`, `category` (free-text), `status` (enum, see §5), `current_location` (nullable text or channel reference), `primary_photo_key` (MinIO object key, nullable), `created_at`, `started_at`, `finished_at` (nullable), `retired_at` (nullable, soft delete).
- **`piece_material`** — `piece_id`, `material_id`, `quantity` (decimal in material's unit), `captured_price_per_unit` (decimal, base currency, snapshotted on add), `captured_at`.
- **`work_session`** — `id`, `piece_id`, `started_at`, `ended_at` (nullable while running), `duration_seconds` (computed on stop), `note`.
- **`piece_status_history`** — `id`, `piece_id`, `from_status`, `to_status`, `changed_at`, `user_id`, `context_json` (e.g. `{sale_id}` or `{channel_id}`). Append-only.

### 4.5 Sales channels
- **`sales_channel`** — `id`, `name`, `type` (`online` | `physical_store` | `event` | `direct`), `commission_pct` (0–100), `contact_name`, `email`, `phone`, `address`, `notes`, `active`.

### 4.6 Buyers
- **`buyer`** — `id`, `name`, `email`, `phone`, `instagram`, `birthdate` (nullable), `address` (jsonb), `interests` (text[]), `notes`, `retired_at` (nullable, soft delete).
- **`buyer_interaction`** — `id`, `buyer_id`, `occurred_at`, `kind` (`meeting` | `message` | `inquiry` | `note` | `other`), `summary`, `created_by_user_id`.

### 4.7 Sales
- **`sale`** — `id`, `piece_id` (unique), `buyer_id`, `channel_id`, `sale_price`, `currency`, `fx_rate_to_base`, `commission_pct_snapshot`, `commission_amount`, `net_amount`, `sold_at`, `refunded_at` (nullable), `notes`.

### 4.8 Indexes
- `(tenant_id, status)` on `piece`.
- `(tenant_id, sold_at)` on `sale`.
- `(material_id, effective_at DESC)` on `material_price`.
- `(buyer_id, occurred_at DESC)` on `buyer_interaction`.
- `(piece_id)` partial on `work_session WHERE ended_at IS NULL` (active-timer guard).

### 4.9 Deletion policy
- Soft delete (`retired_at`) on `piece` and `buyer` — referenced by historical sales.
- `active` flag on `supplier`, `sales_channel`, `material` — must stay queryable in reports.
- Other tables: hard delete is fine.

### 4.10 Money types
- DB column type: `decimal(14, 4)`.
- JSON wire format: string (never float).
- Every money-bearing row stores its source `currency` and an `fx_rate_to_base` captured at write time; reports recompute in base currency from these fields.

## 5. State Machine — Piece Status

Legal transitions, enforced in `pieces.transitionStatus`:

```
in_progress  → in_studio | lost_damaged
in_studio    → reserved | on_sale | sold | lost_damaged
reserved     → in_studio | on_sale | sold | lost_damaged
on_sale      → in_studio | reserved | sold | lost_damaged
sold         → returned                     (only via sales.refund)
returned     → in_studio | lost_damaged
lost_damaged → (terminal)
```

Rules:
- Every transition writes a `piece_status_history` row.
- `on_sale` and `reserved` require `context_json.channel_id`.
- `sold` is only produced by `sales.recordSale` and requires `context_json.sale_id`.
- `returned` is only produced by `sales.refund`.

## 6. API Surface

Convention: every module exposes one `service.ts`. Route handlers under `apps/web/src/app/api/v1/<module>/...` are 5-line wrappers (Zod parse → service call → JSON). Server Actions reuse the same service functions. All endpoints below sit under `/api/v1`. Auth middleware resolves `tenantId` + `userId` before any handler runs.

### 6.1 Auth (NextAuth-owned)
- `POST /api/auth/[...nextauth]` — email+password, magic link, Google.
- `POST /signup` — creates `tenant` + first `user` atomically; sends verification email.

### 6.2 Pieces
- `GET /pieces?status=&q=&cursor=`
- `POST /pieces` (default status `in_progress`)
- `GET /pieces/:id` — detail with materials + sessions + status history + sale if any.
- `PATCH /pieces/:id`
- `POST /pieces/:id/photo` — multipart → MinIO via signed PUT.
- `POST /pieces/:id/status` — `{to, context}`; service validates transition.
- `POST /pieces/:id/materials` — `{materialId, quantity}`; snapshots current price.
- `DELETE /pieces/:id/materials/:materialId` — only when `status='in_progress'`.
- `POST /pieces/:id/sessions/start` — rejects if another session is open for the tenant.
- `POST /pieces/:id/sessions/stop`
- `POST /pieces/:id/sessions` — manual entry.

### 6.3 Materials
- `GET /materials`, `POST /materials`, `PATCH /materials/:id`
- `GET /materials/:id/prices?source=&from=&to=`
- `POST /materials/:id/prices` — manual entry.
- `GET /materials/current-prices` — latest per `(material, source)`.

### 6.4 Suppliers
- `GET /suppliers`, `POST /suppliers`, `PATCH /suppliers/:id`, `DELETE /suppliers/:id` (soft).
- `GET /suppliers/:id/materials`, `POST /suppliers/:id/materials`.
- `POST /suppliers/:id/prices`.

### 6.5 Sales channels
- `GET /channels`, `POST /channels`, `PATCH /channels/:id`.

### 6.6 Buyers
- `GET /buyers?q=&cursor=`, `POST /buyers`, `GET /buyers/:id` (with purchase history + interactions), `PATCH /buyers/:id`.
- `POST /buyers/:id/interactions`, `PATCH /buyers/:id/interactions/:iid`, `DELETE /buyers/:id/interactions/:iid`.

### 6.7 Sales
- `GET /sales?from=&to=&channelId=&buyerId=&cursor=`
- `POST /sales` — `{pieceId, buyerId, channelId, salePrice, currency, fxRateToBase?, soldAt?, notes?}`.
- `PATCH /sales/:id` — limited to `notes`, `soldAt`. Price/currency edits require explicit `override=true` flag (logged).
- `POST /sales/:id/refund` — transitions piece → `returned`; preserves the sale row with `refunded_at`.

### 6.8 Pricing (cost view, no formula)
- `GET /pieces/:id/cost-breakdown` — `{materials, labor, totalCostBase, lastSalePriceBase?, atCurrentPrices: {…}}`. Pure read.

### 6.9 Reports
- `GET /reports/revenue?groupBy=month|channel|buyer|category&from=&to=`
- `GET /reports/inventory?groupBy=status|category`
- `GET /reports/margin?from=&to=` — per-piece sold rows with cost + sale + margin.
- `GET /reports/:name.csv?…` — CSV download.

### 6.10 Tenant settings
- `GET /settings`, `PATCH /settings` — `base_currency`, `hourly_labor_rate`, display preferences.

### 6.11 Conventions
- Cursor pagination, default `limit=50`.
- Timestamps: ISO 8601 UTC strings on the wire.
- Errors: `{error: {code, message, fields?}}`. Codes: `not_found`, `validation_failed`, `forbidden`, `conflict`, `illegal_transition`, `unauthenticated`.
- All requests authenticated; all reads/writes filtered by `tenantId` in the repo layer.

## 7. Cross-Module Flows

Each flow runs in a single Postgres transaction.

**Flow A — Record sale (`sales.recordSale`)**
1. Load piece; assert `status ∈ {in_studio, reserved, on_sale}` else `illegal_transition`.
2. Load channel; snapshot `commission_pct` → `commission_pct_snapshot` (history-stable).
3. Compute `commission_amount = sale_price × commission_pct_snapshot / 100`, `net_amount = sale_price - commission_amount`.
4. Insert `sale`.
5. Update `piece.status = 'sold'`, `current_location = null`.
6. Insert `piece_status_history` row with `context_json = {sale_id}`.

**Flow B — Refund (`sales.refund`)**
1. Set `sale.refunded_at = now()` (idempotent).
2. Insert `piece_status_history` compensating row.
3. Set `piece.status = 'returned'`.
4. Revenue reports filter out refunded sales; margin reports retain cost history.

**Flow C — Add material to piece (`pieces.addMaterial`)** — snapshots current price into `piece_material.captured_price_per_unit`. Historical cost is stable thereafter; "at current prices" view recomputes.

**Flow D — Cost breakdown (`pricing.breakdown`)** — pure read.
- Materials cost = Σ `captured_price_per_unit × quantity`.
- Labor cost = Σ `(duration_seconds / 3600) × tenant.hourly_labor_rate`.
- Returns both "historical" (snapshotted) and "at current prices" totals.

**Flow E — Daily commodity feed (worker)** — 06:00 UTC.
1. Query distinct `(commodity_symbol)` across all tenants where `material.kind='commodity'`.
2. Fetch from configured `CommodityPriceProvider` once per symbol.
3. For each tenant × material using that symbol, insert a `material_price` row with `source='feed'`, captured FX, and unit-converted price.
4. Per-tenant failures are logged and isolated; `material.last_feed_fetched_at` updated on success.

**Flow F — Active timer guard (`pieces.startSession`)**
1. Reject if any `work_session WHERE ended_at IS NULL` exists for the tenant.
2. Stop is idempotent.
3. UI shows a persistent "timer running on *X*" banner everywhere while one exists.

## 8. External Integrations & Infra

### 8.1 Email
- Provider: Resend by default, behind `packages/email`'s `EmailProvider` interface.
- Used for: email verification, magic link, password reset.

### 8.2 Commodity prices
- Pluggable `CommodityPriceProvider` interface in `apps/worker`. v1 ships one implementation against a free metals price API (e.g. `metals.dev` or `goldapi.io`), chosen via env.
- Worker handles unit conversion (oz → g) and FX.

### 8.3 FX rates
- Every money-bearing record stores its own `fx_rate_to_base`.
- Worker uses a free FX source (e.g. `frankfurter.app`) for automated feed entries.
- Manual entries: user supplies the rate (defaults to 1.0 if currency == base).

### 8.4 File storage
- `packages/files` wraps the AWS S3 client.
- Browser uploads via pre-signed PUT URLs issued by `web`.
- Reads via short-lived (15 min) pre-signed GET URLs embedded in API responses.
- Bucket layout: `aura/<tenant_id>/pieces/<piece_id>/<uuid>.<ext>`.
- Variants (`thumb` 256px, `medium` 1024px) generated on upload by a `sharp`-based handler in `web`.

### 8.5 Backups
- Nightly `pg_dump` to host bind `/backups`.
- MinIO data on host bind; backups handled by the host's filesystem snapshots (operator's responsibility, out of scope to automate inside the app).

### 8.6 Configuration
- All env loaded once at boot into a Zod-validated config object (`packages/config`).
- No `process.env` access elsewhere.
- Required vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `COMMODITY_PROVIDER`, `COMMODITY_API_KEY`, `FX_PROVIDER`.

### 8.7 Observability
- `pino` structured JSON logs to stdout, captured by Docker.
- `/healthz` per service.
- Never log secrets or PII beyond `userId` / `tenantId`.

## 9. Auth Model

- **Methods**: email+password, email magic link, Google OAuth.
- **Library**: Auth.js (NextAuth v5) with Prisma adapter.
- **Email verification required** before any data writes succeed for password-flow signups.
- **Session**: database-backed, HTTP-only secure cookie.
- **Tenant resolution**: middleware loads `session.user.id`, joins to `user.tenant_id`, attaches both to a request-scoped `AuthContext` consumed by route handlers and server actions.

## 10. Testing Strategy

**Unit (Vitest)** — pure functions: Zod schemas, money/FX math, state-machine validator, cost-breakdown calculator, commission math. Every branch of the transition matrix covered.

**Integration (Vitest + Testcontainers-postgres)** — the load-bearing layer.
- Fresh Postgres per test or per-suite schema; migrations applied; two seed tenants.
- **Mandatory tenant-isolation test for every service module**: tenant B cannot read or write tenant A's rows.
- Cross-module flow tests for §7 A–F.
- Migration tests on every PR: apply migrations to empty DB, then to a DB seeded from the previous migration tag.

**E2E (Playwright)** — one happy-path per top-level journey, run against `docker compose -f docker-compose.test.yml up`:
1. Signup → create piece → start/stop timer → add materials → finish.
2. Add buyer + channel → record sale → piece flips `sold` → buyer's purchase history populates.
3. View cost-breakdown → view revenue report → export CSV.

**External providers** — `EmailProvider` and `CommodityPriceProvider` get `FakeProvider` test doubles. Real-provider reachability tests gated by an env flag, run manually before release.

**CI** — lint + typecheck + unit + integration on every PR. E2E on `main` and release branches only.

**Not tested** — generated boilerplate, styling, third-party libraries.

## 11. Out of Scope (v1)

- Tax / VAT / invoice PDFs / jurisdiction-aware sales tax.
- Accounting exports (QuickBooks, Xero) beyond CSV.
- Shopify / Etsy / marketplace push/pull sync.
- Outbound email marketing (birthday emails, "you might like this piece" nudges). Transactional emails only.
- Multi-user-per-tenant (schema permits; UI/signup enforce 1:1).
- Native mobile apps (responsive web only).
- i18n (UI in English; data fields are free text).
- RBAC beyond "tenant owner."
- Public storefront / shareable piece pages (slug field is reserved for it).
- Tenant-wide audit log beyond `piece_status_history`.
- Multi-photo gallery per piece (single primary photo only).
- Full-text search (`ILIKE` only on indexed columns).

## 12. Open Questions for Implementation

These are intentionally deferred to the implementation plan, not the spec:
- Specific choice between `metals.dev` and `goldapi.io` (both viable; pick at plan time based on free-tier limits and unit support).
- Exact image variant sizes if 256/1024 turn out wrong in practice.
- Whether to add an explicit "reserved-until" timestamp on `piece` for reservation expiry (currently no auto-expiry).
