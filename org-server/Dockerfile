# syntax=docker/dockerfile:1.7

# --- builder stage ---------------------------------------------------------
# Contains the C toolchain for compiling better-sqlite3's native addon.
# These compilers are dropped from the final image.
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
# `npm install` (not `ci`) since we may not ship a lockfile initially.
# Switch to `npm ci` once package-lock.json is committed.
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop devDependencies so only the runtime deps ship in the final image.
RUN npm prune --omit=dev

# --- runtime stage ---------------------------------------------------------
# Minimal alpine base — no compilers, no package manager usage at runtime.
FROM node:20-alpine AS runtime
WORKDIR /app

# tini = proper PID 1 for correct SIGTERM/SIGINT forwarding.
# wget is needed for the HEALTHCHECK (curl isn't in the base alpine image).
RUN apk add --no-cache tini wget \
 && addgroup -S continuity \
 && adduser -S continuity -G continuity \
 && mkdir -p /data \
 && chown continuity:continuity /data

COPY --from=builder --chown=continuity:continuity /app/node_modules ./node_modules
COPY --from=builder --chown=continuity:continuity /app/dist         ./dist
COPY --from=builder --chown=continuity:continuity /app/package.json ./package.json

USER continuity

ENV NODE_ENV=production \
    CONTINUITY_ORG_PORT=8787 \
    CONTINUITY_ORG_DB_PATH=/data/continuity-org.db

VOLUME ["/data"]
EXPOSE 8787

# tini forwards signals so our graceful shutdown handler actually runs,
# which is what lets better-sqlite3 close cleanly and avoid WAL recovery.
ENTRYPOINT ["/sbin/tini", "--"]

# Hits the public /api/health endpoint — no auth, no DB writes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8787/api/health || exit 1

CMD ["node", "dist/index.js"]
