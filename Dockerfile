# Stage 1: Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Accept VITE_API_BASE_URL as a build-time argument
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy dependency manifests and lockfile
COPY package.json package-lock.json ./

# Install dependencies deterministically
RUN npm ci

# Copy full application source code
COPY . .

# Build Vite static production bundle
RUN npm run build

# Stage 2: Production Stage
FROM nginx:alpine AS production

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check using HTTP request to /healthz
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
