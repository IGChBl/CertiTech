# HANDOVER — CertiTech

Documento de traspaso para la siguiente sesión de desarrollo.
Fecha: 2026-06-14. Rama de este traspaso: `docs/project-handover`.

> Para detalles de instalación, variables de entorno, roles y flujos, ver `README.md`.
> Este documento se centra en **estado actual, cambios recientes, riesgos y próximos pasos**.

---

## 1. Estado actual del proyecto

- MVP funcional: auth (JWT en cookies httpOnly), perfiles cliente/técnico, modo de perfil dual, directorio de técnicos, solicitudes de servicio, chat en tiempo real (Socket.IO), valoraciones, favoritos, suscripciones técnicas y panel admin.
- Stack: Next.js 16 (App Router) + React 19 + TypeScript, Prisma 6 sobre PostgreSQL (Supabase), Tailwind v4.
- Base de datos: 4 migraciones aplicadas; 19 modelos en `prisma/schema.prisma`.
- Validación local (verificada en esta sesión):
  - `npm run lint` → sin errores.
  - `npx tsc --noEmit` → sin errores.
  - `npm run build` → no ejecutado en esta sesión (recomendado correrlo antes de desplegar).
- `main` está al día: `0814aed` es a la vez `HEAD` de esta rama y `origin/main`.

---

## 2. Qué se completó recientemente

Commits más recientes (de más nuevo a más antiguo):

| Commit | Descripción |
| --- | --- |
| `0814aed` | Reduce unread message polling pressure |
| `185e4fa` | Improve Prisma Supabase stability and page load performance |
| `8da3607` | Add admin technician document review checklist |
| `faa20a6` | Merge technician registration UI and dual profile mode |
| `7250869` | Stop tracking private uploaded files |

### 2.1 Revisión documental del admin (`8da3607`)

- `src/app/dashboard/admin/verificaciones/page.tsx`.
- Checklist de documentos del técnico: documento de identidad y récord policial como obligatorios.
- Advierte al admin cuando faltan documentos requeridos y desaconseja aprobar con documentación incompleta.
- Los documentos se visualizan mediante el endpoint privado autenticado (no como estáticos públicos).

### 2.2 Estabilidad Prisma/Supabase y carga de páginas (`185e4fa`)

- Nuevo helper `src/lib/prisma-errors.ts`:
  - `isPrismaConnectionTimeoutError` (detecta P2024 / pool saturado / conexión cerrada).
  - `withDbRetry` (reintentos con backoff exponencial solo ante saturación temporal).
  - `DbBusyError` / `isDbBusyError` (distingue "BD ocupada" de un fallo real, para no cerrar la sesión del usuario).
- Error boundary global `src/app/error.tsx`: muestra mensaje de reintento amable cuando la BD está ocupada.
- Ajustes en sesión/cabecera (`src/lib/auth/session.ts`, `src/lib/auth/page.ts`, `src/components/layout/site-header.tsx`) y páginas (`page.tsx`, `tecnicos/page.tsx`, `cliente/solicitudes/page.tsx`) para reducir presión sobre la BD en la carga.
- Ajuste de `connection_limit`/`pool_timeout` en `.env`/`.env.example`.

### 2.3 Reducción del polling de mensajes no leídos (`0814aed`)

- `src/lib/chat/unread-count-store.ts`.
- Intervalo de sondeo unificado a 60s (antes 30s en producción).
- Backoff exponencial ante fallos consecutivos (hasta 5 min) que se reinicia al primer éxito.
- Bucle auto-reprogramado con `setTimeout` (en vez de `setInterval`).
- No consume red cuando la pestaña está oculta (`visibilitychange`); al volver al primer plano refresca de inmediato y reinicia el backoff.
- Objetivo: reducir carga sobre Supabase manteniendo el badge de no leídos.

### 2.4 Documentos privados fuera de Git (`7250869`)

- `.gitignore` ahora excluye `storage/private/uploads/**`.
- Se dejaron de versionar archivos `.webp` privados que estaban trackeados por error.

### 2.5 Registro de técnico + modo de perfil dual (`faa20a6`, merge)

- Un usuario puede operar como cliente y técnico y alternar con un switcher de modo.
- Endpoints: `enable-dual-profile`, `select-mode`; componentes `BecomeClient`, `BecomeTechnician`, `ModeSwitcher`.
- Cambios en login/registro de técnico, servicios del técnico y panel de chat.
- Incluyó la migración de coordenadas de ubicación del técnico.

---

## 3. Ramas

- `main` (local) = `origin/main` = `0814aed`. Al día.
- `docs/project-handover`: rama actual (solo documentación: este traspaso + README).
- `perf/prisma-supabase-stability` (local): apunta a `185e4fa`, ya integrada en `main`.
- Remotas ya integradas (origen de merges previos): `origin/feature/ui-registro-tecnico`, `origin/Fittoria`.

> Nota: ambas ramas de perf/registro ya están reflejadas en `main`; pueden archivarse/borrarse tras confirmar que no quedan cambios sueltos.

---

## 4. Estado de validación

- ESLint: OK.
- TypeScript (`tsc --noEmit`): OK.
- Build de producción: pendiente de ejecutar antes del próximo despliegue.
- Pruebas automatizadas: no hay suite de tests en el repo; la validación es manual + lint + types.

---

## 5. Problemas / riesgos conocidos

1. **Supabase Free bajo presión**: con varias sesiones/roles a la vez el pool puede saturarse (P2024). Mitigado, no eliminado.
2. **`PRIVATE_UPLOAD_LOCAL_PATH` falta en `.env.example`**: el código tiene default, pero no está documentada en el ejemplo (revisión manual sugerida; no la edité para mantener el alcance).
3. **Almacenamiento local de archivos**: no persiste en entornos serverless/efímeros; falta migrar a un provider cloud.
4. **Pagos no integrados**: la renovación de suscripción solo deja `PENDING_PAYMENT`; el admin cambia el estado a mano.
5. **Acceso a documentos privados**: la lógica de autorización es clave y debe probarse con todos los roles (ver §7).
6. **Sin tests automatizados**: regresiones difíciles de detectar sin validación manual.

---

## 6. Próximas tareas recomendadas

1. **Optimizar llamadas de cabecera/sesión a la BD con cuidado**: revisar `src/lib/auth/session.ts` y `site-header.tsx` para reducir consultas por request sin romper la autorización.
2. **Continuar mejoras de rendimiento en una rama aparte** (p. ej. `perf/...`), no en `main`.
3. **Mejorar motivos de rechazo y notificación de verificación**: comunicar al técnico el motivo del rechazo de forma clara (notificación/email).
4. **Probar acceso a documentos privados** con: admin, técnico (propio y ajeno), cliente y sin sesión (ver §7).
5. **Considerar PostgreSQL local para desarrollo** y reducir presión sobre Supabase Free (ya hay ejemplo en `.env.example`).
6. **Más adelante, considerar Supabase MCP en modo solo-lectura**, no acceso de escritura completo.
7. Documentar `PRIVATE_UPLOAD_LOCAL_PATH` en `.env.example`.
8. Ejecutar `npm run build` y verificar que pasa antes de desplegar.

---

## 7. Verificación específica: acceso a documentos privados

Endpoint: `GET /api/technician/profile-assets/document?kind=<tipo>&index=<n>&technicianProfileId=<id>`

Comportamiento esperado a validar:

- **Admin**: puede ver documentos de cualquier técnico indicando `technicianProfileId` → 200.
- **Técnico**: puede ver **solo** sus propios documentos (resueltos por su `userId`) → 200; no debe poder ver los de otro técnico.
- **Cliente**: cualquier intento → 403.
- **Sin sesión**: → 401/redirección (bloqueado por `requireAuth`).
- Archivo inexistente → 404.

Verificar además que las respuestas llevan `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`, y que los archivos viven en `storage/private/uploads/technicians` (no en `public/`).

---

## 8. Flujo de trabajo seguro para cambios futuros

1. Partir de `main` actualizada y crear una rama temática (`feat/...`, `fix/...`, `perf/...`, `docs/...`).
2. No tocar lógica de aplicación ni el esquema Prisma sin necesidad clara; cambios de esquema → migración revisada.
3. Antes de abrir PR / fusionar, validar localmente:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```
4. Probar manualmente los roles afectados (cliente / técnico / admin) y, si toca documentos, el acceso privado (§7).
5. Mantener secretos fuera de Git (`.env` está en `.gitignore`).
6. Fusionar a `main` solo tras validar; cambios riesgosos van primero a una rama y se prueban allí.

### Comandos para verificar el proyecto

```bash
npm install
npx prisma generate
npm run dev:stable     # o npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

---

## 9. Qué NO hacer

- **No** ejecutar `npx prisma migrate reset` (borra la base de datos).
- **No** exponer ni subir secretos de `.env` (SMTP/Mailtrap, JWT, DATABASE_URL, claves cloud).
- **No** hacer push sin validar (lint + types + build).
- **No** editar `main` directamente para cambios riesgosos; usar una rama.
- **No** versionar ni publicar archivos de `storage/private/uploads/**` (documentos personales).
- **No** servir documentos privados como estáticos ni sin control de acceso por rol.
