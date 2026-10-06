# ==============================================================================
# WildAtlas - Multi-Stage Production Dockerfile for IEEE Reproducibility
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the React + Leaflet Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Install client dependencies with pinned lockfile
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps

# Copy client source code and build production bundle
COPY client/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build and Run the Node.js Server
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV OSRM_BASE_URL=http://osrm:5000

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server application files
COPY server/ ./server/
COPY data/ ./data/

# Copy built frontend assets to server static directory
COPY --from=client-builder /app/client/dist ./server/public

# Expose HTTP API & static server port
EXPOSE 5000

# Start server
WORKDIR /app/server
CMD ["node", "index.js"]
