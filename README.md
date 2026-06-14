# CertiTech - Marketplace de Servicios Técnicos

CertiTech es una plataforma web full-stack para conectar clientes con técnicos y negocios de servicios técnicos (electricidad, plomería, aire acondicionado, carpintería, etc.).

El proyecto está construido como base MVP profesional, escalable y lista para evolucionar hacia producción.

## Stack tecnológico

- Frontend: Next.js 16 (App Router) + React 19 + TypeScript
- Estilos: Tailwind CSS v4 + componentes reutilizables propios
- Backend/API: Route Handlers de Next.js (BFF)
- Base de datos: PostgreSQL
- ORM: Prisma
- Auth: JWT stateless (access + refresh en cookies httpOnly)
- Chat en tiempo real: Socket.IO (endpoint `pages/api/socket.ts`)
- Mapas: Leaflet (`leaflet` + `@types/leaflet`) para ubicación de técnicos
- Validaciones: Zod
- Imágenes: `sharp` (optimización de avatares)
- Seguridad básica: hash con bcrypt, rate limit en endpoints sensibles, guardas por rol

## Roles de usuario

- Cliente
- Técnico / Proveedor
- Administrador

## Funcionalidades implementadas (MVP)

- Landing profesional con buscador y secciones de valor
- Registro/login para cliente y técnico
- Modo de perfil dual: un mismo usuario puede operar como cliente y técnico y alternar con un switcher de modo
- Validación de mayoría de edad (18+) para cualquier registro
- Verificación de correo (flujo token)
- Verificación de cliente y técnico con estados y restricciones de uso
- Suscripciones técnicas (FREE, MONTHLY, YEARLY) con control de visibilidad y acceso
- Foto de perfil para cliente y técnico con subida local y optimización automática
- Recuperación y restablecimiento de contraseña
- Carga de documentos del técnico (identidad, récord policial, evidencias, certificaciones) en almacenamiento privado fuera de `public/`
- Revisión documental del técnico desde el panel admin (checklist de documentos obligatorios)
- Perfil técnico público con reputación, categorías y estado de verificación
- Directorio de técnicos con filtros y ubicación en mapa (Leaflet)
- Publicación y gestión de solicitudes de servicio
- Favoritos de técnicos
- Valoraciones y comentarios post-servicio
- Notificaciones internas
- Chat en tiempo real con Socket.IO
- Dashboards privados para cliente, técnico y admin
- Panel admin con métricas, reportes, usuarios, técnicos, categorías y moderación

## Base de datos (Prisma)

Se modelaron entidades clave:

- `Role`, `User`
- `ClientProfile`, `TechnicianProfile`
- `ServiceCategory`, `TechnicianService`
- `ServiceRequest`, `RequestImage`
- `Chat`, `ChatParticipant`, `Message`
- `Review`, `Favorite`, `Notification`
- `Report`, `VerificationRequest`, `AdminAction`
- `PasswordResetToken`, `EmailVerificationToken`

Incluye:

- `prisma/schema.prisma`
- seed limpio: `prisma/seed.ts`

Migraciones aplicadas (en orden):

1. `20260416173000_init` — esquema inicial
2. `20260505133500_verification_age_hardening` — verificación y regla de edad
3. `20260513110000_technician_subscriptions` — suscripciones técnicas
4. `20260614114949_add_technician_location_coords` — coordenadas de ubicación del técnico

## Variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Variables principales:

- `DATABASE_URL` (app runtime con pooler de Supabase en `6543`)
- `DIRECT_URL` (migraciones con conexión directa en `5432`)
- `NEXT_PUBLIC_APP_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `EMAIL_PROVIDER` (`console`, `smtp`, `resend`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `MAIL_FROM`
- `RESEND_API_KEY` (si `EMAIL_PROVIDER=resend`)
- `UPLOAD_PROVIDER` (`local`, preparado para `cloudinary`, `supabase`, `s3`)
- `UPLOAD_LOCAL_PATH` (archivos públicos como avatares; por defecto `public/uploads`)
- `PRIVATE_UPLOAD_LOCAL_PATH` (documentos privados del técnico; por defecto `storage/private/uploads`). Variable opcional usada por `src/lib/uploads/config.ts`; si no se define, usa el valor por defecto. Aún no está listada en `.env.example`.
- variables de upload/cloud y mapas (preparadas)

Configuración recomendada para Supabase:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=10"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
```

No es necesario alternar manualmente entre `6543` y `5432` durante el día a día:
- La app usa `DATABASE_URL` (pooler)
- Prisma migrate/db push usa `DIRECT_URL`
- Para desarrollo local con múltiples sesiones/roles simultáneos, usa `connection_limit=10`.

## Sistema de foto de perfil

CertiTech incluye un flujo completo para foto de perfil en cliente y técnico:

- Endpoint: `POST /api/profile/avatar` (subir/cambiar)
- Endpoint: `DELETE /api/profile/avatar` (eliminar)
- Provider actual: `UPLOAD_PROVIDER=local`
- Carpeta local: `public/uploads/avatars`
- Campo persistido: `avatarUrl` en `ClientProfile` y `TechnicianProfile`

### Reglas de carga y optimización automática

- Formatos permitidos: JPG, JPEG, PNG, WEBP
- Tamaño máximo original: 8 MB
- Procesamiento backend con `sharp`:
  - resize a `400x400`
  - recorte centrado (`cover`)
  - conversion a WEBP optimizado
- Peso final esperado aproximado: 100 KB a 500 KB segun imagen origen

### Seguridad aplicada

- Validacion de MIME type
- Bloqueo de archivos fuera de formato permitido
- Nombres de archivo unicos
- Escritura en ruta controlada
- Solo se guarda URL publica en DB (`/uploads/avatars/...`)
- Eliminacion segura del avatar anterior al reemplazar

### Migracion futura a Cloudinary / S3 / Supabase

La capa de upload se centraliza en:

- `src/lib/uploads/config.ts`
- `src/lib/uploads/avatar-optimizer.ts`
- `src/lib/services/avatar-upload.ts`

Actualmente el provider `local` esta activo y los providers cloud quedan preparados para implementacion posterior sin romper el contrato del endpoint.

## Almacenamiento de documentos privados del técnico

A diferencia de los avatares (públicos en `public/uploads/avatars`), los documentos del técnico (documento de identidad, récord policial, evidencias de trabajo y certificaciones) son **sensibles** y se guardan fuera de `public/`:

- Carpeta local: `storage/private/uploads/technicians`
- Configuración: `PRIVATE_UPLOAD_LOCAL_PATH` (por defecto `storage/private/uploads`) en `src/lib/uploads/config.ts`
- Los archivos privados **no se versionan**: `.gitignore` excluye `storage/private/uploads/**`

Estos archivos no se sirven como estáticos. Se entregan solo a través de un endpoint autenticado:

- `GET /api/technician/profile-assets/document?kind=<tipo>&index=<n>&technicianProfileId=<id>`
- Control de acceso:
  - `TECHNICIAN`: solo puede ver sus **propios** documentos (resueltos por su `userId`).
  - `ADMIN`: puede ver los documentos de cualquier técnico, indicando `technicianProfileId`.
  - Cualquier otro rol (incluido cliente) recibe `403`.
- Respuesta con cabeceras `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`.

> Importante: estos documentos contienen datos personales. No los expongas como estáticos, no los subas a Git y no los publiques en almacenamiento sin control de acceso.

## Correo (Mailtrap / sandbox de email)

El envío de correo (verificación de cuenta y recuperación de contraseña) está controlado por `EMAIL_PROVIDER`:

- `console` (por defecto en desarrollo): los correos se registran en la consola del servidor; no se envía nada real.
- `smtp`: usa un servidor SMTP. Para pruebas seguras se recomienda **Mailtrap** como sandbox (no entrega correos reales a usuarios):
  ```env
  EMAIL_PROVIDER="smtp"
  SMTP_HOST="smtp.mailtrap.io"
  SMTP_PORT="2525"
  SMTP_USER="<usuario-de-tu-inbox-mailtrap>"
  SMTP_PASS="<password-de-tu-inbox-mailtrap>"
  MAIL_FROM="CertiTech <no-reply@certitech.app>"
  ```
  Las credenciales `SMTP_USER`/`SMTP_PASS` se obtienen del inbox de Mailtrap (Settings > SMTP). Son secretos: no los publiques ni los subas a Git.
- `resend`: usa Resend con `RESEND_API_KEY` (no integrado por defecto).

En desarrollo, si el envío falla la cuenta igualmente se crea y el usuario puede reenviar el correo de verificación desde su dashboard.

## Instalacion y ejecucion local

1. Instalar dependencias

```bash
npm install
```

2. Generar cliente Prisma

```bash
npx prisma generate
# equivalente: npm run prisma:generate
```

3. Aplicar migraciones

```bash
npm run prisma:migrate
```

4. Cargar seed

```bash
npm run db:seed
```

5. Iniciar entorno de desarrollo

```bash
npm run dev:stable   # recomendado: dev con Webpack, más estable para cambios frecuentes de rol/sesión
# alternativa: npm run dev   (Turbopack)
```

App local: `http://localhost:3000`

## Validación del proyecto

Antes de subir cambios, valida que el proyecto compila y pasa el linter:

```bash
npm run lint        # ESLint
npx tsc --noEmit    # chequeo de tipos sin emitir archivos
npm run build       # build de producción de Next.js
```

Estado actual (verificado en esta sesión): `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Credenciales demo (seed limpio)

- Admin:
  - Email: `admin@certitech.app`
  - Password: `Demo12345!`

El seed elimina datos demo de clientes, tecnicos, solicitudes, chats, resenas, favoritos, notificaciones y reportes.
Solo deja:

- 1 administrador funcional
- categorias base activas
- estructura lista para pruebas manuales de registro/verificacion

## Reglas de registro y verificacion

### Regla de edad (obligatoria)

- Cualquier usuario (cliente o tecnico) debe ser mayor de 18 anos.
- Campos requeridos en registro: `birthDate` y confirmacion explicita de mayoria de edad.
- Mensaje de bloqueo:
  - `Debes ser mayor de 18 anos para crear una cuenta en CertiTech.`

### Estados de cliente

- `PENDING`
- `BASIC_VERIFIED`
- `VERIFIED`
- `REJECTED`

Comportamiento:

- Cliente nuevo inicia en `PENDING`.
- Al verificar correo, pasa a `BASIC_VERIFIED` automaticamente.
- Si no cumple verificacion minima, no puede publicar ni contratar servicios.
- Mensaje en estado pendiente:
  - `Tu cuenta esta pendiente de verificacion. Algunas funciones estaran limitadas hasta completar el proceso.`
- Si `isEmailVerified` es `false`, se bloquean funciones clave y se habilita boton de reenvio de correo.

### Estados de tecnico

- `PENDING`
- `IN_REVIEW`
- `VERIFIED`
- `REJECTED`

Comportamiento:

- Tecnico nuevo inicia en `PENDING`.
- Debe subir record policial obligatorio desde su dashboard antes de solicitar revision.
- La solicitud de revision mueve su estado a `IN_REVIEW`.
- No aparece en busquedas publicas hasta `VERIFIED`.
- No recibe solicitudes hasta `VERIFIED`.
- Si es rechazado, se guarda motivo y nota de revision.
- Si `isEmailVerified` es `false`, no puede gestionar solicitudes ni contrataciones y no aparece en listados publicos.

## Suscripciones tecnicas

El tecnico ahora maneja estructura de suscripcion para habilitar visibilidad y captacion:

- Planes:
  - `FREE`
  - `MONTHLY`
  - `YEARLY`
- Estados:
  - `ACTIVE`
  - `EXPIRED`
  - `CANCELLED`
  - `PENDING_PAYMENT`

Campos agregados en `TechnicianProfile`:

- `subscriptionPlan`
- `subscriptionStatus`
- `subscriptionStartDate`
- `subscriptionEndDate`
- `autoRenew`
- `featuredUntil`
- `lastPaymentDate`

### Reglas de negocio activas

- Tecnico `FREE`:
  - puede registrarse y completar perfil
  - NO aparece publicamente
  - NO recibe nuevas solicitudes ni nuevos chats
- Tecnico sin record policial:
  - NO puede solicitar verificacion
  - NO puede activar/renovar suscripcion de pago
  - NO puede aparecer publicamente
  - NO puede recibir nuevos contactos
- Tecnico con plan pago `ACTIVE`:
  - aparece en busquedas y perfil publico (si tambien esta verificado y tiene record policial cargado)
  - puede recibir nuevos contactos
- Tecnico `EXPIRED` / `CANCELLED` / `PENDING_PAYMENT`:
  - mantiene cuenta y trabajos existentes
  - pierde visibilidad y recepcion de nuevos contactos

### Orden de visibilidad publica

Los listados publicos priorizan tecnicos suscritos por plan:

1. `YEARLY`
2. `MONTHLY`
3. `FREE` (actualmente oculto del listado publico)

Tambien se prioriza `featuredUntil` cuando este activo.

### Rutas nuevas de suscripcion

- Tecnico:
  - `GET /dashboard/tecnico/suscripcion`
  - `POST /api/technician/subscription/renew` (solicitud interna, queda `PENDING_PAYMENT`)
- Admin:
  - `GET /dashboard/admin/suscripciones`
  - `PATCH /api/admin/subscriptions` (cambiar plan/estado/extensiones/destacado)

### Preparacion para Stripe (sin integrar aun)

Se creo arquitectura desacoplada para evolucion a pagos reales:

- `src/lib/subscriptions/billing.ts`
- `src/lib/subscriptions/service.ts`
- `src/lib/subscriptions/guards.ts`
- `src/lib/subscriptions/ui.ts`

Con esta base, la integracion de Stripe/checkout solo debera conectar el flujo de pago y actualizar estado de suscripcion.

## Flujo de verificacion de correo

1. Al registrar cliente o tecnico se crea token seguro en `EmailVerificationToken` (expira en 24 horas).
2. Se envia correo con enlace a:
   - `/verificar-correo?token=...`
3. Al abrir el enlace:
   - se valida existencia y expiracion
   - se marca `isEmailVerified=true`
   - se limpian tokens de verificacion del usuario
4. Si el token es invalido o expiro, se muestra mensaje claro en la pagina de verificacion.
5. El usuario puede reenviar correo desde dashboard con:
   - `POST /api/auth/resend-verification`

Notas:

- No se expone el token en respuestas API.
- Si el envio de correo falla, la cuenta igualmente se crea y la API responde con advertencia para usar reenviar.

## Flujo admin de verificaciones

Ruta del modulo: `Dashboard Admin > Verificaciones`.

Desde ese modulo el administrador puede:

- Revisar clientes `PENDING/BASIC_VERIFIED/REJECTED`
- Revisar tecnicos `PENDING/IN_REVIEW/REJECTED`
- Aprobar o rechazar con motivo
- Cambiar estado manualmente
- Ver evidencia/documentos del tecnico y solicitudes de verificacion asociadas

El módulo incluye un **checklist de revisión documental**: marca los documentos obligatorios (documento de identidad, récord policial) y advierte al admin cuando faltan archivos requeridos, evitando aprobar a un técnico con documentación incompleta. Los documentos se visualizan a través del endpoint privado autenticado (ver "Almacenamiento de documentos privados del técnico").

Solo el rol `ADMIN` puede actualizar estados mediante `PATCH /api/admin/verifications`.

## Como probar manualmente

1. Ejecutar seed limpio

```bash
npm run db:seed
```

2. Iniciar sesion admin

- Email: `admin@certitech.app`
- Password: `Demo12345!`

3. Registrar cliente mayor de edad

- Completar registro con fecha de nacimiento valida (>18).
- Verificar correo.
- Revisar en dashboard cliente estado de verificacion.
- Probar crear solicitud (debe bloquearse si no cumple minima verificacion).

4. Registrar tecnico mayor de edad

- Completar campos obligatorios (documento, foto, evidencias, categorias, experiencia).
- Confirmar que inicia en `PENDING`.
- Subir record policial desde `Dashboard > Configuracion` y luego solicitar verificacion.
- Confirmar que no aparece en listado publico hasta aprobacion.

6. Probar foto de perfil

- Entrar a `Dashboard > Configuracion` de cliente o tecnico.
- Subir imagen JPG/PNG/WEBP menor a 8 MB.
- Confirmar vista previa y guardado exitoso.
- Verificar persistencia en header, dashboard, chat, listados y panel admin.
- Probar reemplazo y eliminacion de foto.

7. Probar suscripciones tecnicas

- Registrar tecnico nuevo: inicia como `FREE`.
- Confirmar que no aparece en `/tecnicos`.
- Desde admin, ir a `Dashboard > Suscripciones` y activar plan (`MONTHLY` o `YEARLY`) con estado `ACTIVE`.
- Confirmar que ahora aparece en busquedas/listados publicos y puede recibir nuevos contactos.
- Forzar expiracion manual (fecha pasada o estado `EXPIRED`) y validar que pierde visibilidad publica.

5. Aprobar/rechazar desde admin

- Ir a `Dashboard Admin > Verificaciones`.
- Cambiar estado de cliente o tecnico.
- Si se rechaza, ingresar motivo.
- Verificar notificaciones y mensajes de estado en dashboards.

## Nota Supabase / Prisma

- En Supabase Postgres, aplica migraciones con el usuario que tenga permisos para crear enums y alterar columnas.
- `DATABASE_URL` debe apuntar al pooler (`6543`) con `pgbouncer=true` y `connection_limit=10` para desarrollo estable con varias sesiones concurrentes.
- `DIRECT_URL` debe apuntar a la conexión directa (`5432`) para migraciones y tareas administrativas de Prisma.
- Recomendado:
  - `npm run prisma:generate`
  - `npm run prisma:migrate`
  - `npm run db:seed`
- Si ya existian datos de demo anteriores, el seed actual los limpia automaticamente (excepto el admin definido).

### Estabilidad en desarrollo (cambio frecuente de roles)

Para pruebas intensivas (cerrar sesión e iniciar sesión con cliente/técnico/admin repetidamente):
- Usa `npm run dev` normalmente.
- Si notas recargas agresivas o inestabilidad por hot reload, usa `npm run dev:stable` (webpack).
- Evita correr múltiples servidores `next dev` al mismo tiempo sobre el mismo proyecto.
- Si aparece un error de conexiones abiertas, detén el servidor, espera unos segundos y vuelve a iniciar.

## Scripts utiles

```bash
npm run dev          # Next dev con Turbopack
npm run dev:stable   # Next dev con Webpack (recomendado para sesiones largas / cambio de roles)
npm run build        # build de producción
npm run start        # servir el build
npm run lint         # ESLint
npm run prisma:generate   # = npx prisma generate
npm run prisma:migrate    # aplicar migraciones (usa DIRECT_URL)
npm run prisma:studio     # explorar la BD
npm run db:seed           # seed limpio (deja solo el admin + categorías)
```

Comandos sueltos útiles:

```bash
npx prisma generate
npx tsc --noEmit     # chequeo de tipos
```

## Estructura del proyecto

```text
certitech/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  src/
    app/
      api/
      dashboard/
      tecnicos/
      categorias/
      login/
      registro/
      ...
    components/
      ui/
      layout/
      cards/
      forms/
      chat/
      dashboard/
    lib/
      auth/
      validations/
      services/
      prisma.ts
      constants.ts
      http.ts
    pages/api/
      socket.ts
    proxy.ts
```

## Decisiones tecnicas clave

- Se uso App Router + Route Handlers para concentrar frontend y backend en un monorepo limpio.
- Se aplico JWT en cookies `httpOnly` para sesiones ligeras y faciles de escalar.
- El chat usa Socket.IO para tiempo real y persiste mensajes en PostgreSQL.
- Se implemento `proxy.ts` para proteccion inicial por secciones de dashboard, mientras la autorizacion fuerte vive en cada endpoint y pagina.
- Se forzo render dinamico global en layout para evitar dependencia de DB durante build-time.

## Estado del roadmap

### Fase 1 (MVP)

Cubierta con base funcional y seed limpio para pruebas controladas:

- landing
- auth
- perfiles
- listado/filtros de tecnicos
- perfil publico tecnico
- chat interno
- solicitudes
- valoraciones
- favoritos
- admin basico

### Fase 2 (siguiente iteracion)

- verificacion avanzada con flujo documental completo
- reportes y moderacion con acciones mas profundas
- notificaciones enriquecidas (push/email)
- geolocalizacion / cerca de mi
- pagos
- app movil

## Limitaciones conocidas

- **Pagos no integrados**: las suscripciones técnicas (FREE/MONTHLY/YEARLY) tienen la arquitectura lista (`src/lib/subscriptions/*`) pero no hay pasarela real; la renovación deja el estado en `PENDING_PAYMENT` y el cambio efectivo lo hace el admin manualmente. Stripe queda pendiente.
- **Almacenamiento de archivos local**: avatares y documentos privados se guardan en disco del servidor (`public/uploads` y `storage/private/uploads`). No es persistente en plataformas serverless/efímeras; los providers cloud (`cloudinary`/`supabase`/`s3`) están preparados pero no implementados.
- **Presión sobre Supabase Free**: con varias sesiones/roles concurrentes el pool puede saturarse (P2024 / "base de datos ocupada"). Mitigado con `connection_limit`/`pool_timeout`, reintentos (`withDbRetry`) y reducción del polling de no leídos, pero sigue siendo un límite del plan gratuito.
- **`PRIVATE_UPLOAD_LOCAL_PATH` no está en `.env.example`**: el código tiene un valor por defecto, pero conviene documentar la variable en el ejemplo.
- **Notificaciones**: son internas (en BD); aún no hay push ni email enriquecido.
- **Geolocalización**: existen coordenadas y mapa (Leaflet) del técnico, pero no un buscador "cerca de mí" completo.
- **Motivos de rechazo / notificación de verificación**: el rechazo guarda motivo, pero la comunicación al técnico puede mejorarse.

## Notas de desarrollo

- En entorno local sin SMTP real, los correos se registran en consola y el endpoint de recuperacion devuelve `previewToken` en desarrollo para pruebas.
- El endpoint de Socket.IO es `GET /api/socket` (bootstrap) y websocket path `/api/socket_io`.
- La estabilidad de Prisma/Supabase se apoya en `src/lib/prisma-errors.ts` (`withDbRetry`, `isDbBusyError`, `DbBusyError`) y un error boundary global (`src/app/error.tsx`) que muestra un mensaje de reintento en vez de cerrar la sesión cuando la BD está ocupada.

---

Proyecto preparado como base de startup real para demo con inversionistas, clases o pilotos iniciales de mercado.

