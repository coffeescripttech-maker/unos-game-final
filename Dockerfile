# UNOS — single-service production image.
# Builds the whole npm workspace (shared → client → server) and runs the
# Express server, which serves the built client + /api + Socket.IO on one port.

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Bring in the full repo (node_modules/.env excluded via .dockerignore)
COPY . .

# Install all workspace deps (devDeps included — needed to build AND run tsx)
RUN npm ci --no-audit --no-fund

# Build shared → client → server (vite build + tsc typecheck)
RUN npm run build

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "server/src/index.ts"]