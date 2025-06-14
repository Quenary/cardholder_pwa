# Cardholder_pwa is an app for storing your discount cards in one place.

## Why:

Yet another card holder. There are many apps to accomplish this goal, but they are either distributed in app stores or lack some features. Here are some most important aspects:

- PWA stands for progressive web app, so you can install it on device (e.g. smartphone) from browser and use offline (read-only of course)
- Easy to self-host
- Open-source

### Core

- Angular for frontend
- Python with FastAPI and SQLAlchemy for backend

### Preparation

- Environment variables are not required for the application to work, but you can still define some (in docker command, in .env file, or in docker-compose file). There is [.env.example](/.env.example) containing list of vars with description.
- For PWA and video-stream code scanner functionality you need HTTPS access to the app. Personally, I use a separate Nginx with Let's Encrypt certificate.

### Deploy

- Using docker

```
# pull image
docker pull quenary/cardholder_pwa:latest

# run container
docker run -d -p 80:80 \
-v $HOME/.cardholder_pwa:/cardholder_pwa \
quenary/cardholder_pwa:latest
```

- Using docker-compose

```
# copy docker-compose.prod.yml file to desired location (or in portainer)
docker-compose -f docker-compose.prod.yml up -d
```
