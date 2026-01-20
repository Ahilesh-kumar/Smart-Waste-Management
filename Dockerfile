# Build stage for frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY backend/package*.json ./
RUN npm install --only=production
COPY backend/ ./

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./public

# Copy config
COPY config.json ./

# Expose port
EXPOSE 3001

# Health check for Render
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "index.js"]
