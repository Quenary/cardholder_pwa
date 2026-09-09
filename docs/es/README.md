# Cardholder PWA es una aplicación autoalojada para tus tarjetas de fidelidad y de descuento

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

## Demostración

- [Demo #1](https://cardholder-pwa.onrender.com)
- [Demo #2](https://p01--cardholder-pwa--yhc2hsmvw6xy.code.run)

Están alojadas en proveedores gratuitos, que pueden suspender los contenedores. La primera carga puede tardar, hasta un minuto según ellos.

### Funciones principales

- PWA: se puede instalar en el dispositivo desde el navegador y usar incluso sin conexión (solo lectura)
- Varios usuarios, con los roles propietario, administrador y miembro
- Tarjetas compartidas entre usuarios (una tarjeta o todas a la vez)
- Recuperación de contraseña por correo electrónico (si SMTP está configurado)
- Fácil de autoalojar
- Código abierto

### Tecnologías

- Angular para el frontend
- Python con FastAPI y SQLAlchemy para el backend

### Códigos compatibles

- En resumen, los principales tipos 2D (por ejemplo el código QR) y 1D (por ejemplo el código de barras).
- La aplicación se apoya en:
  - [zxing-js/browser](https://github.com/zxing-js/browser) y [quagga2](https://github.com/ericblade/quagga2) para leer los códigos.
  - [bwip-js](https://github.com/metafloor/bwip-js) para mostrarlos.
- Códigos compatibles:
  - [Tipos de `zxing-js`](https://github.com/zxing-js/library?tab=readme-ov-file#supported-formats)
  - [Tipos de `quagga2`](https://github.com/ericblade/quagga2/tree/master/src/reader)
  - [Tipos de `bwip-js`](https://github.com/metafloor/bwip-js/wiki/BWIPP-Barcode-Types)
- Puedes escribir el valor y el tipo del código a mano: `bwip-js` lo mostrará si lo admite.
- He notado que a `zxing` le cuesta detectar códigos claros sobre fondo oscuro. Puede que a otros lectores les pase lo mismo.

### Preparación

- Las **variables de entorno** no son obligatorias, pero puedes definir algunas. El archivo [.env.example](/.env.example) las enumera todas con su descripción. Recomiendo configurar al menos **SMTP**, para habilitar la recuperación de contraseña.
- La **PWA** y el escáner por **flujo de vídeo** necesitan acceso por **HTTPS**. Yo uso un Nginx aparte con un certificado de Let's Encrypt.

### Despliegue

- Con `docker`

```bash
# descargar la imagen
docker pull ghcr.io/quenary/cardholder_pwa:1

# ejecutar el contenedor
docker run -d -p 80:80 \
-v $HOME/.cardholder_pwa:/cardholder_pwa \
ghcr.io/quenary/cardholder_pwa:1
```

- Con `docker-compose`

```bash
# coloca uno de los archivos docker-compose donde quieras (o en Portainer)
# docker-compose.sqlite.yml - para una base sqlite local
# docker-compose.pg.yml | docker-compose.my.yml - para una base completa (contenedor aparte en la red de la app por defecto)
docker-compose -f <archivo> up -d
```

### Roles de las cuentas

- **La primera cuenta registrada** (tras el despliegue o la migración desde la versión 0.0.13) recibe el rol de **propietario**. Por ahora esa cuenta no se puede eliminar, y el rol de propietario no se puede reasignar de forma cómoda.
- Puede que sea excesivo, pero por si acaso también añadí los roles de administrador y miembro.
- El **propietario** puede:
  - Cambiar algunos ajustes de la aplicación desde la interfaz
  - Asignar el rol de administrador a otros miembros
  - Eliminar cuentas de administradores o de miembros
- El **administrador** puede:
  - Cambiar algunos ajustes de la aplicación desde la interfaz
  - Eliminar cuentas de miembros

### Tarjetas compartidas

Consulta [docs/SHARED_CARDS.md](/docs/SHARED_CARDS.md).

### Contribuir y seguridad

Estos documentos están solo en inglés:

- [Contributing](/docs/CONTRIBUTING.md)
- [Security](/docs/SECURITY.md)
