# syntax=docker/dockerfile:1.7
# Build from the repository root:  docker build -f apps/web/Dockerfile -t shoot-web .
ARG NODE_VERSION=24.22.2

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Install every workspace dependency once (cached on the lockfile).
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/
COPY packages/config/package.json packages/config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
# Build-time values only; real secrets arrive at runtime. No database is reachable while building,
# so the landing pages render on their first request instead of at build time.
ENV SKIP_BUILD_STATIC_GENERATION=true \
    PAYLOAD_SECRET=build-time-placeholder-secret-0000000000 \
    DATABASE_URI=postgres://build:build@127.0.0.1:5432/build \
    NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
    PREVIEW_SECRET=build-time-placeholder \
    CRON_SECRET=build-time-placeholder
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}
RUN pnpm --filter web build

# One-off release step: apply committed migrations (docker-compose.prod.yml runs it before web).
FROM builder AS migrate
ENV NODE_ENV=production PAYLOAD_MIGRATING=true
WORKDIR /repo/apps/web
CMD ["pnpm", "payload", "migrate"]

# Runtime: the standalone server only, as a non-root user.
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
