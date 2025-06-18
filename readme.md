# Cardholder PWA is a self-hosted app for your loyalty and discount cards

<p align="center">
  <img src="resources/login.jpg" width="30%" />
  <img src="resources/qr.jpg" width="30%" />
  <img src="resources/cardholder_pwa.gif" width="30%" />
</p>

## Why:

Yet another card holder. There are many apps to accomplish this goal, but they are either distributed in app stores or lack some features. Here are some most important aspects:

- PWA stands for progressive web app, so you can install it on device from browser and use offline (read-only, of course)
- Multi-user support
- Easy to self-host
- Open-source

### Core

- Angular for frontend
- Python with FastAPI and SQLAlchemy for backend

### Preparation

- Environment variables are not required for the application to work, but you can still define some (in docker command, in .env file, or in docker-compose file). There is [.env.example](/.env.example) containing list of vars with description. I’d recommend setting up at least SMTP settings to enable password recovery.
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
