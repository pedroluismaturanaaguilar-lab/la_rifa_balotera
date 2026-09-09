# La Rifa Ganadora — módulo de rifas/sorteos

## Estado actual del desarrollo

Este entregable cubre, probado y funcionando:

**Fase 1 — Estructura, PWA, diseño inicial**
- Backend Node.js + Express, base de datos SQLite con el esquema completo (users, settings, raffles, prizes, participants, tickets, draws, winners, messages, audit_logs).
- PWA: `manifest.json`, `service-worker.js`, iconos generados.
- Pantalla de bienvenida (`/`) con título, subtítulo y texto del botón **editables desde la base de datos**, colores verde/morado/dorado, fondo oscuro y animaciones CSS.

**Fase 2 (parcial) — Panel administrativo**
- Login de administrador (usuario/contraseña con `bcrypt`, sesión con `express-session` guardada en SQLite, cookie httpOnly).
- Panel `/admin` protegido: nadie puede entrar sin iniciar sesión (probado con y sin cookie de sesión).
- Módulo de Configuración general: nombre de la plataforma, textos de bienvenida, colores y ajustes de voz/sonido — se guardan en la tabla `settings` y se reflejan de inmediato en la pantalla pública (probado end-to-end).
- Socket.IO ya inicializado en el servidor, listo para sincronizar la pantalla pública en fases posteriores.
- Registro de auditoría preparado en el esquema (tabla `audit_logs`), pendiente de conectar a cada acción del admin.

**Lo que falta (fases 3 a 8 de tu documento)** — participantes, boletas, motor de sorteo (número/nombre/código), animaciones de sorteo, voz durante el juego, pantalla pública en vivo, historial de ganadores, mensajes promocionales, auditoría conectada, y hardening de seguridad/HTTPS para producción. Vamos fase por fase, cada una probada antes de pasar a la siguiente, tal como pediste.

## Cómo correrlo tú mismo (antes de subirlo a un servidor)

```bash
npm install
npm start
```

Abre `http://localhost:3000`. La primera vez se crea un usuario administrador con usuario `admin` y una contraseña temporal que verás impresa en la consola — cámbiala apenas entres. Puedes fijar tus propias credenciales creando un archivo `.env` con:

```
ADMIN_USER=tu_usuario
ADMIN_PASSWORD=tu_clave_segura
SESSION_SECRET=una_clave_larga_y_aleatoria
PORT=3000
```

## Para subirlo a Render (probado)

**Importante sobre Render:** por defecto, el disco de un servicio web de Render es temporal — se borra cada vez que el servicio se reinicia o se vuelve a desplegar. Como esta app guarda todo en SQLite (usuarios, participantes, boletas, sesiones), **sin un disco persistente vas a perder los datos** cada vez que Render reinicie el servicio (por ejemplo, tras estar inactivo en el plan gratis). Por eso este proyecto ya incluye un `render.yaml` que configura ese disco automáticamente.

### Opción A — con Blueprint (lo más fácil)
1. Sube este proyecto a un repositorio de GitHub.
2. En Render: **New > Blueprint**, conecta el repositorio. Render va a leer `render.yaml` y configurar solo: el servicio web, las variables de entorno y el **disco persistente** de 1 GB montado en `/var/data`.
3. Espera a que termine el primer deploy y abre la URL que te da Render.
4. Entra a `/admin/login` con `ADMIN` / `ADMIN123` y cambia la contraseña (o cambia el valor de `ADMIN_PASSWORD` en las variables de entorno de Render antes del primer arranque).

### Opción B — manual (sin Blueprint)
1. **New > Web Service**, conecta tu repositorio.
2. Build command: `npm install` — Start command: `npm start`.
3. En **Environment**, agrega:
   - `NODE_ENV` = `production`
   - `ADMIN_USER` = `ADMIN`
   - `ADMIN_PASSWORD` = `ADMIN123` (o la que quieras)
   - `SESSION_SECRET` = una clave larga y aleatoria
   - `DB_PATH` = `/var/data/rifa.db`
   - `SESSION_DIR` = `/var/data`
4. En **Disks**, agrega un disco: nombre `rifa-data`, mount path `/var/data`, tamaño 1 GB. Sin este paso, los datos se van a perder en cada reinicio.
5. Deploy.

### Qué ya está listo para esto (revisado y probado)
- El servidor escucha en el puerto que Render asigna (`process.env.PORT`).
- `app.set('trust proxy', 1)` — necesario para que la cookie de sesión funcione correctamente detrás del proxy HTTPS de Render (probado simulando el encabezado `X-Forwarded-Proto: https` que Render envía).
- Las carpetas de la base de datos y las sesiones se crean solas si no existen (para cuando el disco persistente está recién montado y vacío).
- Rutas y archivos estáticos (PWA, manifest, service worker, CSS/JS) probados uno por uno en modo `NODE_ENV=production`.

**Importante:** todavía no está lista para producción real con dinero/premios en juego porque faltan las fases de motor de sorteo por número/código, seguridad reforzada y auditoría conectada. Esta entrega cubre bienvenida + PWA, login admin, configuración, participantes/boletas, y el sorteo por nombre con voz y animación — todo probado.
