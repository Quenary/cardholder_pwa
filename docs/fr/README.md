# Cardholder PWA est une application auto-hébergée pour vos cartes de fidélité et de réduction

- 🇬🇧 [English](/README.md)
- 🇩🇪 [Deutsch](/docs/de/README.md)
- 🇪🇸 [Español](/docs/es/README.md)
- 🇫🇷 [Français](/docs/fr/README.md)
- 🇮🇹 [Italiano](/docs/it/README.md)
- 🇷🇺 [Русский](/docs/ru/README.md)

<p align="center">
  <img src="../../resources/screenshots/hero.webp" alt="Cardholder PWA : liste des cartes, QR code, partage et thème sombre" width="100%" />
</p>

<sub>Les enseignes, logos et codes des captures sont inventés pour la démo.</sub>

## Démo

- [Démo #1](https://cardholder-pwa.onrender.com)
- [Démo #2](https://p01--cardholder-pwa--yhc2hsmvw6xy.code.run)

Elles tournent chez des hébergeurs gratuits, qui peuvent suspendre les conteneurs. Le premier chargement peut donc être long, jusqu'à une minute d'après eux.

### Principales fonctionnalités

- PWA, installable sur l'appareil depuis le navigateur et utilisable même hors ligne (en lecture seule)
- Scan d'une carte à la caméra (lampe, caméra avant/arrière), ou saisie du code et de son type
- La plupart des codes 2D et 1D sont pris en charge
- Logos sur les cartes, en grille ou en grand format, favoris, recherche, tri et filtres
- Code en plein écran avec inversion des couleurs, à présenter en caisse
- Multi-utilisateur, avec les rôles propriétaire, administrateur et membre
- Partage de cartes entre utilisateurs (une carte ou toutes d'un coup), que le destinataire accepte ou refuse
- Thème clair et sombre, selon le système
- Anglais, allemand, espagnol, français, italien et russe
- Récupération du mot de passe par e-mail (si SMTP est configuré)
- Authentification à deux facteurs avec une application d'authentification et des codes de récupération à usage unique
- Simple à auto-héberger
- Open source

### Documentation

Ces documents sont uniquement en anglais :

- [Codes pris en charge](/docs/CODES.md)
- [Authentification à deux facteurs](/docs/TWO_FACTOR.md)
- [Chiffrement](/docs/ENCRYPTION.md)
- [Rôles des comptes](/docs/ROLES.md)
- [Cartes partagées](/docs/SHARED_CARDS.md)
- [Contributing](/docs/CONTRIBUTING.md)
- [Security](/docs/SECURITY.md)

### Captures d'écran

|                              Cartes                              |                              Code                               |                             Édition                             |                              Partage                              |
| :--------------------------------------------------------------: | :-------------------------------------------------------------: | :-------------------------------------------------------------: | :---------------------------------------------------------------: |
| <img src="../../resources/screenshots/cards.webp" width="200" /> | <img src="../../resources/screenshots/code.webp" width="200" /> | <img src="../../resources/screenshots/edit.webp" width="200" /> | <img src="../../resources/screenshots/shared.webp" width="200" /> |

|                            Connexion                             |                             Grandes cartes                             |                                 Admin                                 |                             Thème sombre                              |
| :--------------------------------------------------------------: | :--------------------------------------------------------------------: | :-------------------------------------------------------------------: | :-------------------------------------------------------------------: |
| <img src="../../resources/screenshots/login.webp" width="200" /> | <img src="../../resources/screenshots/cards-large.webp" width="200" /> | <img src="../../resources/screenshots/admin-user.webp" width="200" /> | <img src="../../resources/screenshots/cards-dark.webp" width="200" /> |

### Préparation

- Les **variables d'environnement** ne sont pas obligatoires, mais vous pouvez en définir. Le fichier [.env.example](/.env.example) les liste toutes avec leur description. Je recommande de configurer au moins **SMTP**, pour activer la récupération du mot de passe, et **MASTER_KEY** si vous voulez l'authentification à deux facteurs. Voir [Chiffrement](/docs/ENCRYPTION.md).
- Le fonctionnement de la **PWA** et du scanner par **flux vidéo** demande un accès en **HTTPS**. J'utilise un Nginx séparé avec un certificat Let's Encrypt.

### Déploiement

- Avec `docker`

```bash
# recuperer l'image
docker pull ghcr.io/quenary/cardholder_pwa:1

# lancer le conteneur
docker run -d -p 80:80 \
-v $HOME/.cardholder_pwa:/cardholder_pwa \
ghcr.io/quenary/cardholder_pwa:1
```

- Avec `docker-compose`

```bash
# placez l'un des fichiers docker-compose a l'endroit voulu (ou dans Portainer)
# docker-compose.sqlite.yml - pour une base sqlite locale
# docker-compose.pg.yml | docker-compose.my.yml - pour une base complete (conteneur separe dans le reseau de l'app par defaut)
docker-compose -f <fichier> up -d
```
