# syntax=docker/dockerfile:1.7
FROM node:24.14.0-alpine AS builder
WORKDIR /app
RUN npm install --global npm@11.6.0 && npm cache clean --force
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS runtime
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY scripts/docker-entrypoint.sh /docker-entrypoint.d/40-aims-runtime-config.sh
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
