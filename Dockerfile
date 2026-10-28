# Stage 1: Build Frontend (Vite) & Backend Bundle (esbuild)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package manifests for optimal layer caching
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies (TypeScript, Vite, Tailwind, esbuild, etc.)
RUN npm ci

# Copy full source trees
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build both frontend (frontend/dist) and backend bundle (backend/dist/index.js)
RUN npm run build

# Stage 2: Ultra-Lean Production Runtime (~70 MB)
# Contains ONLY compiled assets and minimal runtime dependencies

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only the backend's package manifest to isolate runtime dependencies
# This excludes dev tools (TypeScript, Vite, Tailwind, Rollup, PostCSS, tsx)
COPY --chown=node:node backend/package.json ./package.json

# Install strictly production dependencies (express, cors, multer, exceljs) and clear npm cache
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts \
    && npm cache clean --force

# Copy ONLY the compiled artifacts from the builder stage:
# - Frontend static build -> /app/public
# - Backend bundled executable -> /app/server.js
COPY --from=builder --chown=node:node /app/frontend/dist ./public
COPY --from=builder --chown=node:node /app/backend/dist/index.js ./server.js

# DevSecOps best practice: execute as non-privileged user
USER node

EXPOSE 3000

# Built-in lightweight health check using Node 20's native fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Direct execution with Node (fast startup, proper PID 1 signal handling)
CMD ["node", "server.js"]
