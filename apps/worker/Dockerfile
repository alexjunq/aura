## AURA worker container.
##
## Long-running Node process that owns the daily commodity feed
## (apps/worker/src/jobs/commodity-feed.ts).

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
RUN pnpm --filter @aura/db generate
RUN pnpm --filter @aura/worker build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# openssl is required at runtime by the Prisma query engine binary on alpine.
RUN apk add --no-cache wget openssl

COPY --from=builder /repo/apps/worker/dist ./apps/worker/dist
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/worker/package.json ./apps/worker/package.json

EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -q -O- http://localhost:3001/healthz || exit 1

CMD ["node", "apps/worker/dist/index.js"]
