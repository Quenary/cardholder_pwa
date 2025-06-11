# Stage 1 - frontend build
FROM node:22 as frontend-builder

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend .
RUN npm run build

# Stage 2 - backend build
FROM python:3.11 as backend-builder

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN touch ./backend/app/.env
COPY .env ./backend/app/ 2>/dev/null || true

COPY backend .

# Stage 3 - combine
FROM python:3.11-slim

WORKDIR /app

# Copy backend and deps
COPY --from=backend-builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=backend-builder /app /app/backend

# Copy frontend static
COPY --from=frontend-builder /app/dist/cardholder_pwa/browser /app/frontend

# Install nginx
RUN apt-get update && apt-get install -y nginx &&
    rm -rf /var/lib/apt/lists/* &&
    apt-get clean

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Directory for sqlite and other files
RUN mkdir -p /cardholder_pwa && chmod 777 /cardholder_pwa

# Открываем порты
EXPOSE 80

# Запускаем сервисы
CMD service nginx start &&
    cd /app/backend &&
    uvicorn app.main:app --host 0.0.0.0 --port 8000
