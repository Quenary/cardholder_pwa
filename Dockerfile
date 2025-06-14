# Stage 1 - frontend build
FROM node:20 AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
RUN npm run build

# Stage 2 - backend build
FROM python:3.11 AS backend-builder
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend .
COPY .env* ./app

# Stage 3 - container build
FROM python:3.11-slim
WORKDIR /

ARG VERSION
ENV VERSION=$VERSION

RUN apt-get update && apt-get install -y nginx supervisor && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

COPY --from=frontend-builder /app/dist/cardholder_pwa/browser /app/frontend
COPY --from=backend-builder /app /app/backend
COPY --from=backend-builder /usr/local/ /usr/local/
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Dir for sqlite and other files
RUN mkdir -p /cardholder_pwa && chmod 777 /cardholder_pwa

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]