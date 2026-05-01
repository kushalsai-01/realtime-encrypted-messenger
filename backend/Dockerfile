# ─── Stage 1: Install production dependencies only ────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install ONLY production dependencies — devDependencies (nodemon) are excluded
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 2: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Set production environment explicitly in the image
ENV NODE_ENV=production

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY index.js ./
COPY package.json ./

# Switch to non-root user
USER appuser

EXPOSE 3000

# Health check — server must respond 200 from /health before K8s marks it Ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
