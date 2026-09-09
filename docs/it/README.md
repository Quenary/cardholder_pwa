# Cardholder PWA è un'applicazione self-hosted per le tue carte fedeltà e sconto

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

Sono ospitate su servizi gratuiti, che possono sospendere i container. Il primo caricamento può quindi essere lento, fino a un minuto secondo le loro note.

### Funzionalità principali

- PWA, installabile sul dispositivo dal browser e utilizzabile anche offline (in sola lettura)
- Più utenti, con i ruoli proprietario, amministratore e membro
- Carte condivise tra utenti (una carta o tutte insieme)
- Recupero della password via e-mail (se SMTP è configurato)
- Facile da ospitare in proprio
- Open source

### Tecnologie

- Angular per il frontend
- Python con FastAPI e SQLAlchemy per il backend

### Codici supportati

- In breve, i principali tipi 2D (per esempio il codice QR) e 1D (per esempio il codice a barre).
- L'applicazione si basa su:
  - [zxing-js/browser](https://github.com/zxing-js/browser) e [quagga2](https://github.com/ericblade/quagga2) per la lettura dei codici.
  - [bwip-js](https://github.com/metafloor/bwip-js) per mostrarli.
- Codici supportati:
  - [Tipi di `zxing-js`](https://github.com/zxing-js/library?tab=readme-ov-file#supported-formats)
  - [Tipi di `quagga2`](https://github.com/ericblade/quagga2/tree/master/src/reader)
  - [Tipi di `bwip-js`](https://github.com/metafloor/bwip-js/wiki/BWIPP-Barcode-Types)
- Puoi inserire a mano il valore e il tipo del codice: `bwip-js` lo mostrerà, se lo supporta.
- Ho notato che `zxing` fatica a rilevare codici chiari su sfondo scuro. Forse la cosa riguarda anche gli altri lettori.

### Preparazione

- Le **variabili d'ambiente** non sono obbligatorie, ma puoi impostarne alcune. Il file [.env.example](/.env.example) le elenca tutte con la relativa descrizione. Consiglio di configurare almeno **SMTP**, per abilitare il recupero della password.
- La **PWA** e lo scanner tramite **flusso video** richiedono un accesso in **HTTPS**. Io uso un Nginx separato con un certificato Let's Encrypt.

### Distribuzione

- Con `docker`

```bash
# scaricare l'immagine
docker pull ghcr.io/quenary/cardholder_pwa:1

# avviare il container
docker run -d -p 80:80 \
-v $HOME/.cardholder_pwa:/cardholder_pwa \
ghcr.io/quenary/cardholder_pwa:1
```

- Con `docker-compose`

```bash
# posiziona uno dei file docker-compose dove preferisci (o in Portainer)
# docker-compose.sqlite.yml - per un database sqlite locale
# docker-compose.pg.yml | docker-compose.my.yml - per un database completo (container separato nella rete dell'app per impostazione predefinita)
docker-compose -f <file> up -d
```

### Ruoli degli account

- **Il primo account registrato** (dopo la distribuzione o la migrazione dalla versione 0.0.13) riceve il ruolo di **proprietario**. Per ora questo account non può essere eliminato, e il ruolo di proprietario non può essere riassegnato in modo comodo.
- Forse è eccessivo, ma per sicurezza ho aggiunto anche i ruoli di amministratore e membro.
- Il **proprietario** può:
  - Modificare alcune impostazioni dell'applicazione dall'interfaccia
  - Assegnare il ruolo di amministratore ad altri membri
  - Eliminare account di amministratori o membri
- L'**amministratore** può:
  - Modificare alcune impostazioni dell'applicazione dall'interfaccia
  - Eliminare account di membri

### Carte condivise

Vedi [docs/SHARED_CARDS.md](/docs/SHARED_CARDS.md).

### Contribuire e sicurezza

Questi documenti sono solo in inglese:

- [Contributing](/docs/CONTRIBUTING.md)
- [Security](/docs/SECURITY.md)
