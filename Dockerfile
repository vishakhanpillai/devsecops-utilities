# syntax=docker/dockerfile:1

# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files for layer caching
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies (including devDependencies required for Vite & Tailwind build)
RUN npm ci

# Copy source files
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Compile frontend static bundle (outputs to /app/frontend/dist)
RUN npm run build:frontend

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy root and workspace package files
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled frontend distribution from builder
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy backend source code and config
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Ensure non-root node user owns application directory
RUN chown -R node:node /app

# Security: Run as non-root user
USER node

EXPOSE 3000

# Container health check using Node 20 native fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the unified backend server on port 3000
CMD ["npm", "start"]
