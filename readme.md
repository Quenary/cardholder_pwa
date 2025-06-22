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

### Supported codes

- App relies on [zxing-js/browser](https://github.com/zxing-js/browser) for scanning and [bwip-js](https://github.com/metafloor/bwip-js) for displaying codes.
- [Supported codes](https://github.com/zxing-js/library?tab=readme-ov-file#supported-formats) of `zxing-js`
- [Supported codes](https://github.com/metafloor/bwip-js/wiki/BWIPP-Barcode-Types) of `bwip-js`
- I plan to add [quagga2](https://github.com/ericblade/quagga2#:~:text=during%20the%20session.-,Possible%20values%20are,-%3A) to the project for better support of scanning 1D codes.
- Technically you can enter value and type of code manually and `bwip-js` will display the code (if it is supported). But for scanning we are currently limited by `zxing-js`
- I noticed that zxing has a hard time detecting light codes on dark backgrounds. Maybe other scanners are affected by this as well.

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
# place one of the docker-compose files to desired location (or in Portainer)
# docker-compose.sqlite.yml for local sqlite db
# docker-compose.pg.yml for postgres db (separate container in app network by default)
docker-compose -f <filename e.g. docker-compose.pg.yml> up -d
```

### Account roles

- The first registered user (after deployment or migration from version 0.0.13) will be assigned to the owner role. For now this account cannot be deleted and owner role cannot be reassigned in a convenient way.
- Might be an overkill, but just in case, i also added admin and member roles.
- The owner can:
  - Change some app settings from the ui
  - Assign admin role to other members
  - Delete admins or members accounts
- The admin can:
  - Change some app settings from the ui
  - Delete members accounts
