# Cardholder PWA ist eine selbst gehostete Anwendung für Ihre Kunden- und Rabattkarten

- 🇬🇧 [English](/README.md)
- 🇩🇪 [Deutsch](/docs/de/README.md)
- 🇪🇸 [Español](/docs/es/README.md)
- 🇫🇷 [Français](/docs/fr/README.md)
- 🇮🇹 [Italiano](/docs/it/README.md)
- 🇷🇺 [Русский](/docs/ru/README.md)

<p align="center">
  <img src="../../resources/screenshots/hero.webp" alt="Cardholder PWA: Kartenliste, QR-Code, Teilen und dunkles Design" width="100%" />
</p>

<sub>Marken, Logos und Codes in den Screenshots sind für die Demo erfunden.</sub>

## Demo

- [Demo #1](https://cardholder-pwa.onrender.com)
- [Demo #2](https://p01--cardholder-pwa--yhc2hsmvw6xy.code.run)

Sie laufen bei kostenlosen Anbietern, die Container aussetzen können. Der erste Aufruf kann deshalb lange dauern, nach deren Angaben bis zu einer Minute.

### Wichtigste Funktionen

- PWA – lässt sich aus dem Browser auf dem Gerät installieren und auch offline nutzen (nur lesend)
- Karten mit der Kamera scannen (Taschenlampe, Front-/Rückkamera) oder Code und Typ eingeben
- Logos auf den Karten, als Raster oder große Karten, Favoriten, Suche, Sortierung und Filter
- Code im Vollbild mit Farbumkehr, zum Vorzeigen an der Kasse
- Mehrbenutzerbetrieb mit den Rollen Besitzer, Administrator und Mitglied
- Karten mit anderen Benutzern teilen (eine oder alle auf einmal); der Empfänger nimmt an oder lehnt ab
- Helles und dunkles Design, je nach System
- Englisch, Deutsch, Spanisch, Französisch, Italienisch und Russisch
- Passwort-Wiederherstellung per E-Mail (wenn SMTP eingerichtet ist)
- Einfach selbst zu hosten
- Open Source

### Screenshots

| Karten | Code | Bearbeiten | Teilen |
| :---: | :---: | :---: | :---: |
| <img src="../../resources/screenshots/cards.webp" width="200" /> | <img src="../../resources/screenshots/code.webp" width="200" /> | <img src="../../resources/screenshots/edit.webp" width="200" /> | <img src="../../resources/screenshots/shared.webp" width="200" /> |

| Anmeldung | Große Karten | Admin | Dunkles Design |
| :---: | :---: | :---: | :---: |
| <img src="../../resources/screenshots/login.webp" width="200" /> | <img src="../../resources/screenshots/cards-large.webp" width="200" /> | <img src="../../resources/screenshots/admin-user.webp" width="200" /> | <img src="../../resources/screenshots/cards-dark.webp" width="200" /> |

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
