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
RUN apk add --no-cache wget

# Copy Next.js standalone bundle + static assets.
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
# Prisma engines are required at runtime when prisma is in the bundle.
COPY --from=builder /repo/node_modules/.pnpm/@prisma+engines* /app/node_modules/.pnpm/

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -q -O- http://localhost:3000/healthz || exit 1

CMD ["node", "apps/web/server.js"]
