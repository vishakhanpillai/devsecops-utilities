# syntax=docker/dockerfile:1

# ==========================================
# Stage 1: Build Frontend & Backend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package manifests for layer caching
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install build dependencies
RUN npm ci

# Copy source trees
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build both frontend and backend bundles
RUN npm run build

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy backend package manifest to install only production dependencies
COPY --chown=node:node backend/package.json ./package.json

# Install backend production dependencies only and purge npm cache
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# Copy compiled distribution assets with non-root ownership
COPY --from=builder --chown=node:node /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=node:node /app/backend/dist/index.js ./backend/dist/index.js

# Security: Run as non-root user
USER node

EXPOSE 3000

# Container health check using Node 20 native fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the compiled backend server
CMD ["node", "backend/dist/index.js"]
