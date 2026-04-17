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
- Verificacion de correo (flujo token)
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
- seed realista: `prisma/seed.ts`

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
- `SMTP_*` y `MAIL_FROM` (opcional en desarrollo)
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

## Credenciales demo (seed)

- Admin:
  - Email: `admin@certitech.app`
  - Password: `Demo12345!`

- Clientes:
  - `ana@cliente.com`, `carlos@cliente.com`, `mariana@cliente.com`, `jose@cliente.com`
  - Password: `Demo12345!`

- Tecnicos:
  - `luis.electricista@certitech.com`
  - `sofia.plomeria@certitech.com`
  - `henry.aire@certitech.com`
  - `marco.carpinteria@certitech.com`
  - `daniela.pintura@certitech.com`
  - `oscar.soldadura@certitech.com`
  - Password comun: `Demo12345!`

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

Cubierta con base funcional y datos demo:

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

