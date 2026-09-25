# UNOS — single-service production image.
# Builds the whole npm workspace (shared → client → server) and runs the
# Express server, which serves the built client + /api + Socket.IO on one port.

# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install workspace deps (devDeps included — needed to build)
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci --no-audit --no-fund

# Build shared → client → server (typecheck + vite build)
COPY . .
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Full install (keeps tsx, a devDep of the server, available at runtime)
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci --no-audit --no-fund

# Server source + shared source (tsx resolves @shared via tsconfig paths)
COPY server server
COPY shared shared

# Built client bundle for static hosting
COPY --from=build /app/client/dist client/dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 3001
CMD ["npx", "tsx", "server/src/index.ts"]