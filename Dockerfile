# Stage 1 - frontend build
FROM node:22 AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
COPY CHANGELOG.md ./public/
RUN npm run build

# Stage 2 - backend build
FROM python:3.13 AS backend-builder
WORKDIR /app
# Install uv
RUN pip install --no-cache-dir uv
# Install deps
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

# Stage 3 - Runtime image
FROM python:3.13-slim AS runtime
WORKDIR /

ARG VERSION

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Frontend
COPY --from=frontend-builder /app/dist/cardholder_pwa/browser /app/frontend

# Backend
COPY backend /app/backend
# Python deps
COPY --from=backend-builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Environment
COPY .env* /app/
RUN echo "$VERSION" > /app/version

# Dir for sqlite and other files
RUN mkdir -p /cardholder_pwa && chmod 700 /cardholder_pwa

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/public/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]