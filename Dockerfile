# Build stage for frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./public

# Copy config
COPY config.json ./

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "index.js"]
