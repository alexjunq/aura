## Multi-stage build for the AURA web app.
##
## Stage 1: install + build. Use the full workspace context so Prisma
## codegen and Next.js's transpilePackages can see the shared packages.
##
## Stage 2: copy the standalone output + node_modules + Prisma engine
## from stage 1 into a slim runtime image.

FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/email/package.json packages/email/package.json
COPY packages/files/package.json packages/files/package.json
COPY packages/logger/package.json packages/logger/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /repo
COPY tsconfig.base.json tsconfig.json ./
COPY packages packages
COPY apps apps
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @aura/db generate
RUN pnpm --filter @aura/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# openssl is required at runtime by the Prisma query engine binary.
RUN apk add --no-cache wget openssl

# Next.js standalone output + static assets.
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static

# Prisma client + engines.
#
# We have `@prisma/client` in `serverExternalPackages` (see
# apps/web/next.config.mjs), so Next.js's standalone trace deliberately
# *excludes* it from the standalone bundle. We have to put it back at
# runtime. The earlier wildcard
#
#   COPY .../node_modules/.pnpm/@prisma+engines* /app/node_modules/.pnpm/
#
# is broken: in pnpm 11's store the `@prisma+engines*` pattern matches
# both `@prisma+engines@…` and `@prisma+engines-version@…`, whose
# `node_modules/@prisma/engines-version` subpaths conflict (one is a
# package directory, the other a symlink). Buildkit then refuses with
#   "cannot replace to directory ... /engines-version with file".
#
# Robust fix: copy the whole workspace node_modules into /app. pnpm's
# `.pnpm` content-addressed layout plus the hoisted `node_modules/@prisma`
# and `node_modules/.prisma` symlinks all resolve correctly when copied
# as one tree. Yes the image is larger, but Prisma's engine alone is
# ~60 MB and this avoids a class of cross-stage symlink bugs.
COPY --from=builder /repo/node_modules /app/node_modules

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -q -O- http://localhost:3000/healthz || exit 1

CMD ["node", "apps/web/server.js"]
