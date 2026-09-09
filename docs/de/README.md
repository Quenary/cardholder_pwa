# Cardholder PWA ist eine selbst gehostete Anwendung für Ihre Kunden- und Rabattkarten

- 🇬🇧 [English](/README.md)
- 🇩🇪 [Deutsch](/docs/de/README.md)
- 🇪🇸 [Español](/docs/es/README.md)
- 🇫🇷 [Français](/docs/fr/README.md)
- 🇮🇹 [Italiano](/docs/it/README.md)
- 🇷🇺 [Русский](/docs/ru/README.md)

<p align="center">
  <img src="../../resources/login.jpg" width="30%" />
  <img src="../../resources/qr.jpg" width="30%" />
  <img src="../../resources/cardholder_pwa.gif" width="30%" />
</p>

## Demo

- [Demo #1](https://cardholder-pwa.onrender.com)
- [Demo #2](https://p01--cardholder-pwa--yhc2hsmvw6xy.code.run)

Sie laufen bei kostenlosen Anbietern, die Container aussetzen können. Der erste Aufruf kann deshalb lange dauern, nach deren Angaben bis zu einer Minute.

### Wichtigste Funktionen

- PWA, aus dem Browser auf dem Gerät installierbar und auch offline nutzbar (nur lesend)
- Mehrere Benutzer, mit den Rollen Eigentümer, Administrator und Mitglied
- Geteilte Karten zwischen Benutzern (eine Karte oder alle auf einmal)
- Passwort zurücksetzen per E-Mail (wenn SMTP eingerichtet ist)
- Einfach selbst zu hosten
- Open Source

### Technik

- Angular für das Frontend
- Python mit FastAPI und SQLAlchemy für das Backend

### Unterstützte Codes

- Kurz gesagt die gängigen 2D-Typen (etwa der QR-Code) und 1D-Typen (etwa der Barcode).
- Die Anwendung setzt auf:
  - [zxing-js/browser](https://github.com/zxing-js/browser) und [quagga2](https://github.com/ericblade/quagga2) zum Lesen der Codes.
  - [bwip-js](https://github.com/metafloor/bwip-js) zur Darstellung.
- Unterstützte Codes:
  - [Typen von `zxing-js`](https://github.com/zxing-js/library?tab=readme-ov-file#supported-formats)
  - [Typen von `quagga2`](https://github.com/ericblade/quagga2/tree/master/src/reader)
  - [Typen von `bwip-js`](https://github.com/metafloor/bwip-js/wiki/BWIPP-Barcode-Types)
- Wert und Typ des Codes lassen sich auch von Hand eingeben, `bwip-js` stellt ihn dar, sofern er unterstützt wird.
- Mir ist aufgefallen, dass `zxing` helle Codes auf dunklem Hintergrund schlecht erkennt. Andere Leser sind davon vielleicht ebenso betroffen.

### Vorbereitung

- **Umgebungsvariablen** sind nicht erforderlich, Sie können aber welche setzen. In [.env.example](/.env.example) sind alle mit Beschreibung aufgeführt. Ich empfehle, mindestens **SMTP** einzurichten, damit das Zurücksetzen des Passworts funktioniert.
- Für die **PWA** und den Scanner über den **Videostream** ist ein Zugriff über **HTTPS** nötig. Ich verwende dafür ein eigenes Nginx mit einem Let's-Encrypt-Zertifikat.

### Bereitstellung

- Mit `docker`

```bash
# Image holen
docker pull ghcr.io/quenary/cardholder_pwa:1

# Container starten
docker run -d -p 80:80 \
-v $HOME/.cardholder_pwa:/cardholder_pwa \
ghcr.io/quenary/cardholder_pwa:1
```

- Mit `docker-compose`

```bash
# eine der docker-compose-Dateien an den gewuenschten Ort legen (oder in Portainer)
# docker-compose.sqlite.yml - fuer eine lokale sqlite-Datenbank
# docker-compose.pg.yml | docker-compose.my.yml - fuer eine vollwertige Datenbank (standardmaessig eigener Container im Netz der App)
docker-compose -f <Datei> up -d
```

### Kontenrollen

- **Das zuerst registrierte Konto** (nach der Bereitstellung oder der Migration von Version 0.0.13) erhält die Rolle **Eigentümer**. Dieses Konto lässt sich vorerst nicht löschen, und die Rolle des Eigentümers lässt sich nicht bequem übertragen.
- Vielleicht übertrieben, aber für alle Fälle habe ich auch die Rollen Administrator und Mitglied ergänzt.
- Der **Eigentümer** kann:
  - Einige Anwendungseinstellungen über die Oberfläche ändern
  - Anderen Mitgliedern die Administratorrolle geben
  - Konten von Administratoren oder Mitgliedern löschen
- Der **Administrator** kann:
  - Einige Anwendungseinstellungen über die Oberfläche ändern
  - Konten von Mitgliedern löschen

### Geteilte Karten

Siehe [docs/SHARED_CARDS.md](/docs/SHARED_CARDS.md).

### Mitwirken und Sicherheit

Diese Dokumente gibt es nur auf Englisch:

- [Contributing](/docs/CONTRIBUTING.md)
- [Security](/docs/SECURITY.md)
