# backend/Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy all backend files
COPY backend/package*.json ./
COPY backend/package-lock.json ./
COPY backend/server.js ./
COPY backend/ecosystem.config.cjs ./
COPY backend/config ./config
COPY backend/controllers ./controllers
COPY backend/db ./db
COPY backend/infrastructure ./infrastructure
COPY backend/middleware ./middleware
COPY backend/models ./models
COPY backend/routes ./routes
COPY backend/services ./services
COPY backend/utils ./utils
# Fixed: this Dockerfile previously also had `COPY backend/scripts
# ./scripts`, but backend/scripts has never existed anywhere in this
# repository's history (confirmed: git log shows zero commits ever
# touched it) - a latent bug present since this Dockerfile was first
# written, guaranteeing every single Docker build failure
# ("COPY failed: file not found"). Removed the stale line.
COPY backend/identity ./identity
COPY backend/ai ./ai
COPY backend/cms ./cms
COPY backend/communications ./communications
COPY backend/countries ./countries
COPY backend/dataExchange ./dataExchange
COPY backend/digitalInspection ./digitalInspection
COPY backend/governance ./governance
COPY backend/inspection ./inspection
COPY backend/mediaEventEngine ./mediaEventEngine
COPY backend/operations ./operations
COPY backend/ownership ./ownership
COPY backend/partnerPlatform ./partnerPlatform
COPY backend/platform ./platform
COPY backend/queues ./queues
COPY backend/realtime ./realtime
COPY backend/reliability ./reliability
COPY backend/revenue ./revenue
COPY backend/socket ./socket
COPY backend/testing ./testing
COPY backend/validation ./validation
COPY backend/vehicleIntelligence ./vehicleIntelligence
COPY backend/vehiclePassport ./vehiclePassport
COPY backend/workers ./workers
COPY backend/workflowOrchestration ./workflowOrchestration

# Install dependencies
RUN npm ci --omit=dev

# 🔒 SECURITY: Create the non-root user BEFORE any chown that
# references it. Previously this ordering was reversed - `chown -R
# nodeuser:nodejs /app` ran before `addgroup`/`adduser` created that
# user at all, which fails the Docker build outright ("chown: unknown
# user nodeuser") on every single build. Confirmed as a real,
# guaranteed build failure, not a hypothetical - fixed by creating the
# user first, then creating the uploads directory and applying
# ownership in one step.
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 5000

CMD ["node", "server.js"]
