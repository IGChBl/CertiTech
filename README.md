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
- Validaciones: Zod
- Seguridad básica: hash con bcrypt, rate limit en endpoints sensibles, guardas por rol

## Roles de usuario

- Cliente
- Técnico / Proveedor
- Administrador

## Funcionalidades implementadas (MVP)

- Landing profesional con buscador y secciones de valor
- Registro/login para cliente y técnico
- Validación de mayoría de edad (18+) para cualquier registro
- Verificación de correo (flujo token)
- Verificación de cliente y técnico con estados y restricciones de uso
- Suscripciones técnicas (FREE, MONTHLY, YEARLY) con control de visibilidad y acceso
- Foto de perfil para cliente y técnico con subida local y optimización automática
- Recuperación y restablecimiento de contraseña
- Perfil técnico público con reputación, categorías y estado de verificación
- Directorio de técnicos con filtros
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
- migración inicial SQL: `prisma/migrations/20260416173000_init/migration.sql`
- migración de verificación/edad: `prisma/migrations/20260505133500_verification_age_hardening/migration.sql`
- seed limpio: `prisma/seed.ts`

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
- `UPLOAD_LOCAL_PATH` (por defecto `public/uploads`)
- variables de upload/cloud y mapas (preparadas)

Configuración recomendada para Supabase:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=5"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
```

No es necesario alternar manualmente entre `6543` y `5432` durante el día a día:
- La app usa `DATABASE_URL` (pooler)
- Prisma migrate/db push usa `DIRECT_URL`

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

## Instalacion y ejecucion local

1. Instalar dependencias

```bash
npm install
```

2. Generar cliente Prisma

```bash
npm run prisma:generate
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
npm run dev
```

App local: `http://localhost:3000`

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
- `DATABASE_URL` debe apuntar al pooler (`6543`) con `pgbouncer=true` y `connection_limit=5` para desarrollo estable con consultas concurrentes.
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
npm run dev
npm run dev:stable
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run db:seed
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

## Notas de desarrollo

- En entorno local sin SMTP real, los correos se registran en consola y el endpoint de recuperacion devuelve `previewToken` en desarrollo para pruebas.
- El endpoint de Socket.IO es `GET /api/socket` (bootstrap) y websocket path `/api/socket_io`.

---

Proyecto preparado como base de startup real para demo con inversionistas, clases o pilotos iniciales de mercado.

