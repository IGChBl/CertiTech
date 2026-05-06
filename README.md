# CertiTech - Marketplace de Servicios Tecnicos

CertiTech es una plataforma web full-stack para conectar clientes con tecnicos y negocios de servicios tecnicos (electricidad, plomeria, aire acondicionado, carpinteria, etc.).

El proyecto esta construido como base MVP profesional, escalable y lista para evolucionar hacia produccion.

## Stack tecnologico

- Frontend: Next.js 16 (App Router) + React 19 + TypeScript
- Estilos: Tailwind CSS v4 + componentes reutilizables propios
- Backend/API: Route Handlers de Next.js (BFF)
- Base de datos: PostgreSQL
- ORM: Prisma
- Auth: JWT stateless (access + refresh en cookies httpOnly)
- Chat en tiempo real: Socket.IO (endpoint `pages/api/socket.ts`)
- Validaciones: Zod
- Seguridad basica: hash con bcrypt, rate limit en endpoints sensibles, guardas por rol

## Roles de usuario

- Cliente
- Tecnico / Proveedor
- Administrador

## Funcionalidades implementadas (MVP)

- Landing profesional con buscador y secciones de valor
- Registro/login para cliente y tecnico
- Validacion de mayoria de edad (18+) para cualquier registro
- Verificacion de correo (flujo token)
- Verificacion de cliente y tecnico con estados y restricciones de uso
- Recuperacion y restablecimiento de contrasena
- Perfil tecnico publico con reputacion, categorias y estado de verificacion
- Directorio de tecnicos con filtros
- Publicacion y gestion de solicitudes de servicio
- Favoritos de tecnicos
- Valoraciones y comentarios post-servicio
- Notificaciones internas
- Chat en tiempo real con Socket.IO
- Dashboards privados para cliente, tecnico y admin
- Panel admin con metricas, reportes, usuarios, tecnicos, categorias y moderacion

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
- migracion inicial SQL: `prisma/migrations/20260416173000_init/migration.sql`
- migracion de verificacion/edad: `prisma/migrations/20260505133500_verification_age_hardening/migration.sql`
- seed limpio: `prisma/seed.ts`

## Variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Variables principales:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `EMAIL_PROVIDER` (`console`, `smtp`, `resend`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `MAIL_FROM`
- `RESEND_API_KEY` (si `EMAIL_PROVIDER=resend`)
- variables de upload/cloud y mapas (preparadas)

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

- Tecnico nuevo inicia en `IN_REVIEW`.
- No aparece en busquedas publicas hasta `VERIFIED`.
- No recibe solicitudes hasta `VERIFIED`.
- Si es rechazado, se guarda motivo y nota de revision.
- Si `isEmailVerified` es `false`, no puede gestionar solicitudes ni contrataciones y no aparece en listados publicos.

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
- Confirmar que queda en `IN_REVIEW`.
- Confirmar que no aparece en listado publico hasta aprobacion.

5. Aprobar/rechazar desde admin

- Ir a `Dashboard Admin > Verificaciones`.
- Cambiar estado de cliente o tecnico.
- Si se rechaza, ingresar motivo.
- Verificar notificaciones y mensajes de estado en dashboards.

## Nota Supabase / Prisma

- En Supabase Postgres, aplica migraciones con el usuario que tenga permisos para crear enums y alterar columnas.
- Recomendado:
  - `npm run prisma:generate`
  - `npm run prisma:migrate`
  - `npm run db:seed`
- Si ya existian datos de demo anteriores, el seed actual los limpia automaticamente (excepto el admin definido).

## Scripts utiles

```bash
npm run dev
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

