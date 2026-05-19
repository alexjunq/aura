# AURA — self-hosted deployment

Production deployment is a single `docker compose up -d` on a Linux VPS.
This document covers prerequisites, DNS, env, and the smoke tests you
should run before sending traffic.

## Prerequisites

- A VPS running a recent Linux (Debian 12 or Ubuntu 22.04+ tested).
- Docker 25+ and the Docker Compose plugin (v2).
- A domain you control (e.g. `aura.example.com`) with the ability to
  add DNS records. Caddy fetches Let's Encrypt certificates on first
  boot, so the host must be reachable on ports 80 and 443.
- About 2 GiB of RAM and 10 GiB of disk for a single-tenant install;
  more if you expect lots of photos.

## DNS

Two A (or AAAA) records pointing at the VPS:

- `aura.example.com.            A   <vps-ip>`
- `photos.aura.example.com.     A   <vps-ip>`

The `photos.` subdomain reverse-proxies straight to MinIO and serves
the pre-signed photo URLs that the browser dereferences. (Spec
residual #6.)

## Configuration

```sh
git clone <this repo> /opt/aura
cd /opt/aura
cp .env.example .env
```

Edit `.env` with production values. Important fields:

| Var | Why |
| --- | --- |
| `AURA_HOST` | Apex hostname for the app (matches DNS). |
| `AURA_PHOTOS_HOST` | `photos.` subdomain (matches DNS). |
| `NEXTAUTH_SECRET` | `openssl rand -base64 48` |
| `NEXTAUTH_URL` | `https://${AURA_HOST}` |
| `DATABASE_URL` | `postgresql://aura:STRONG_PW@postgres:5432/aura?schema=public` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Must match `DATABASE_URL`. |
| `EMAIL_PROVIDER` | `resend` recommended in prod. |
| `EMAIL_API_KEY` | Resend (or chosen provider) API key. |
| `EMAIL_FROM` | A verified `from` address. |
| `S3_ENDPOINT` / `S3_PUBLIC_URL` | `https://${AURA_PHOTOS_HOST}` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Set to whatever values you want; MinIO uses them as its root credentials. |
| `S3_BUCKET` | `aura` (created by you, see below). |
| `COMMODITY_PROVIDER` / `COMMODITY_API_KEY` | `metals_dev` + the key from metals.dev. |
| `FX_PROVIDER` | `frankfurter` (no key needed). |

## First boot

```sh
docker compose -f docker-compose.prod.yml up -d
```

Caddy will obtain TLS certificates automatically. Watch `docker compose logs caddy` until you see "certificate obtained successfully".

Apply migrations:

```sh
docker compose -f docker-compose.prod.yml exec web \
  node ./node_modules/.pnpm/prisma@*/node_modules/prisma/build/index.js migrate deploy
```

Create the MinIO bucket once:

```sh
docker compose -f docker-compose.prod.yml run --rm --entrypoint /bin/sh minio -c \
  'mc alias set local http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD && \
   mc mb local/aura'
```

(Or open the MinIO console at `https://${AURA_PHOTOS_HOST}/minio` —
caddy proxies the same backend.)

## Smoke tests

1. `curl -fsS https://${AURA_HOST}/healthz` → `{"status":"ok"}`.
2. Visit `https://${AURA_HOST}/signup`, create an account. Check the
   Resend dashboard for the welcome email.
3. Sign in, create a piece, start the timer for a minute, stop it,
   confirm a `work_session` row exists:
   ```sh
   docker compose -f docker-compose.prod.yml exec postgres \
     psql -U aura -d aura -c "SELECT count(*) FROM work_session;"
   ```
4. Upload a photo on a piece's detail page. The page should reload
   with a thumbnail rendered via the `photos.` subdomain.
5. Trigger the commodity feed manually:
   ```sh
   docker compose -f docker-compose.prod.yml exec worker \
     node -e 'import("./apps/worker/dist/jobs/commodity-feed.js").then(async (m) => {
       const cm = await import("./apps/worker/dist/providers/commodity/index.js");
       const fx = await import("./apps/worker/dist/providers/fx/index.js");
       const r = await m.runCommodityFeed(cm.getCommodityProvider(), fx.getFxProvider());
       console.log(r);
     })'
   ```
6. Verify a backup is produced overnight (or kick one off manually):
   ```sh
   docker compose -f docker-compose.prod.yml exec backup /usr/local/bin/backup.sh
   ls ./backups/
   ```

## Updating

```sh
git pull
docker compose -f docker-compose.prod.yml build web worker
docker compose -f docker-compose.prod.yml up -d
# If migrations were added:
docker compose -f docker-compose.prod.yml exec web \
  node ./node_modules/.pnpm/prisma@*/node_modules/prisma/build/index.js migrate deploy
```

## Backups

`./backups/` on the host is bind-mounted into the `backup` service.
A nightly cron at 03:30 UTC runs `pg_dump --no-owner --clean --if-exists` and gzips the output. Files older than `RETENTION_DAYS` (default 14) are pruned.

MinIO data is on a named volume (`minio-data`). For off-host backups,
take a filesystem-level snapshot of the host or use MinIO's own
[`mc mirror`](https://min.io/docs/minio/linux/reference/minio-mc/mc-mirror.html)
to a remote bucket — that's out of scope for this app.

## Observability

`pino` logs structured JSON to stdout in production. Pipe to your
preferred log shipper (Loki, Vector, Datadog, etc.). Each request log
includes `tenantId` and `userId`; secrets are redacted at the logger
configuration level.
