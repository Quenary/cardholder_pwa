# Cardholder PWA es una aplicación autoalojada para tus tarjetas de fidelidad y de descuento

- 🇬🇧 [English](/README.md)
- 🇩🇪 [Deutsch](/docs/de/README.md)
- 🇪🇸 [Español](/docs/es/README.md)
- 🇫🇷 [Français](/docs/fr/README.md)
- 🇮🇹 [Italiano](/docs/it/README.md)
- 🇷🇺 [Русский](/docs/ru/README.md)

<p align="center">
  <img src="../../resources/screenshots/hero.webp" alt="Cardholder PWA: lista de tarjetas, código QR, compartir y tema oscuro" width="100%" />
</p>

<sub>Las marcas, logotipos y códigos de las capturas son inventados para la demo.</sub>

## Demostración

- [Demo #1](https://cardholder-pwa.onrender.com)
- [Demo #2](https://p01--cardholder-pwa--yhc2hsmvw6xy.code.run)

Están alojadas en proveedores gratuitos, que pueden suspender los contenedores. La primera carga puede tardar, hasta un minuto según ellos.

### Funciones principales

- PWA: se instala en el dispositivo desde el navegador y funciona incluso sin conexión (solo lectura)
- Escaneo de tarjetas con la cámara (linterna, cámara delantera/trasera) o introducción manual del código y su tipo
- Logotipos en las tarjetas, en cuadrícula o en tamaño grande, favoritos, búsqueda, orden y filtros
- Código a pantalla completa con inversión de colores, para mostrarlo en caja
- Varios usuarios con los roles de propietario, administrador y miembro
- Compartir tarjetas entre usuarios (una o todas a la vez), que el destinatario acepta o rechaza
- Tema claro y oscuro, según el sistema
- Inglés, alemán, español, francés, italiano y ruso
- Recuperación de contraseña por correo (si SMTP está configurado)
- Autenticación en dos pasos con una aplicación de autenticación y códigos de recuperación de un solo uso
- Fácil de autoalojar
- Código abierto

### Capturas de pantalla

|                             Tarjetas                             |                             Código                              |                             Edición                             |                             Compartir                             |
| :--------------------------------------------------------------: | :-------------------------------------------------------------: | :-------------------------------------------------------------: | :---------------------------------------------------------------: |
| <img src="../../resources/screenshots/cards.webp" width="200" /> | <img src="../../resources/screenshots/code.webp" width="200" /> | <img src="../../resources/screenshots/edit.webp" width="200" /> | <img src="../../resources/screenshots/shared.webp" width="200" /> |

|                         Inicio de sesión                         |                            Tarjetas grandes                            |                                 Admin                                 |                              Tema oscuro                              |
| :--------------------------------------------------------------: | :--------------------------------------------------------------------: | :-------------------------------------------------------------------: | :-------------------------------------------------------------------: |
| <img src="../../resources/screenshots/login.webp" width="200" /> | <img src="../../resources/screenshots/cards-large.webp" width="200" /> | <img src="../../resources/screenshots/admin-user.webp" width="200" /> | <img src="../../resources/screenshots/cards-dark.webp" width="200" /> |

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

- Las **variables de entorno** no son obligatorias, pero puedes definir algunas. El archivo [.env.example](/.env.example) las enumera todas con su descripción. Recomiendo configurar al menos **SMTP**, para habilitar la recuperación de contraseña, y **MASTER_KEY** si quieres la autenticación en dos pasos.
- **MASTER_KEY** es la clave general de los secretos que se guardan. Hoy solo se usa para la autenticación en dos pasos: el secreto TOTP y la clave con la que se calcula el HMAC de los códigos de recuperación. Genérala con `openssl rand -base64 32` y guarda una copia aparte de la copia de seguridad de la base de datos. Sin ella, los usuarios no pueden activar la 2FA. Cambiarla o perderla deja inservibles los secretos y los códigos ya guardados; un administrador tiene que restablecer a esos usuarios (o el propietario puede usar el SQL de abajo). Todavía no hay rotación de la clave. Una herramienta futura necesitará el prefijo `v1:` del texto cifrado guardado.
- La **PWA** y el escáner por **flujo de vídeo** necesitan acceso por **HTTPS**. Yo uso un Nginx aparte con un certificado de Let's Encrypt.

### Autenticación en dos pasos

En la página de usuario, elige **Activar 2FA**, escanea el código QR con una aplicación de autenticación y confírmalo con tu contraseña y un código de 6 dígitos. La aplicación muestra entonces diez códigos de recuperación, una sola vez. Cada código sirve una vez si pierdes el autenticador. Un administrador o el propietario puede restablecer la 2FA de otro usuario desde el diálogo de administración de ese usuario (no la propia, ni la del propietario). Si el propietario pierde el autenticador y todos los códigos de recuperación, la única salida es SQL en la base de datos:

```sql
UPDATE users SET two_factor_secret = NULL, two_factor_enabled_at = NULL, two_factor_last_step = NULL, two_factor_failed_attempts = 0, two_factor_locked_until = NULL WHERE username = '<name>';
DELETE FROM two_factor_recovery_codes WHERE user_id = (SELECT id FROM users WHERE username = '<name>');
```

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
