# Contexto — EQUIdata

Guía rápida para retomar el proyecto. Para el historial detallado milestone por milestone (M0–M9), ver [140826-planspec.md](140826-planspec.md). La idea original está en [CLAUDE.md](CLAUDE.md).

## Qué es

EQUIdata: plataforma de e-learning (estadística aplicada a estudios del desarrollo y género) para la Fundación WWB. **MVP local sin base de datos** — pensado como esqueleto real, no un prototipo: los datos viven en memoria detrás de una capa de acceso aislada, para que Supabase (cuando llegue) solo reemplace la fuente de datos sin tocar pantallas ni lógica.

## Cómo correrlo

```bash
npm run dev      # servidor en localhost:3000
npm test         # vitest, 51 tests
npx tsc --noEmit # type-check
```

**Backend**: `NEXT_PUBLIC_DATA_SOURCE` en `.env.local` decide la fuente de datos — `mock` (por defecto) usa `MockRepository` en memoria; `supabase` usa la base de datos y autenticación reales. Ver sección "Backend real (Supabase)" abajo.

**Login (modo mock)**: `vvaloyes@fundacionwwbcol.org` entra como profesor; cualquier otro correo (ej. `valentina.mendoza@fundacionwwbcol.org`) entra como la única cuenta de estudiante de la demo (Valentina). Código OTP: cualquier 6 dígitos.

**Login (modo Supabase)**: OTP real por correo (`supabase.auth.signInWithOtp`/`verifyOtp`) y Google real (`signInWithOAuth`, requiere el proveedor configurado en el dashboard de Supabase). Cada correo distinto crea su propia cuenta real — ya no existe "cualquier correo entra como Valentina". El rol (`student`/`teacher`) lo asigna un trigger de Postgres al crear la cuenta, comparando el correo contra el mismo valor fijo que antes vivía en `src/lib/auth/teacherEmail.ts` (ver `supabase/migrations/0002_rls.sql`).

**Aviso (modo mock)**: los datos viven en memoria del navegador (`MockRepository`, singleton del lado del cliente). Una recarga completa de página los reinicia — navegar por links no.

## Arquitectura (no romper esto)

- **Nada importa datos mock ni de Supabase directamente.** Todo pasa por `Repository` (`src/lib/data/repository.ts`, interfaz) → `MockRepository` (`src/lib/data/mock/`) o `SupabaseRepository` (`src/lib/data/supabase/`) vía `getRepository()` (`src/lib/data/index.ts`), que elige según `isSupabaseMode()` (`src/lib/data/dataSource.ts`). Las pantallas nunca saben cuál está activa.
- **Lógica de negocio pura en `src/lib/logic/`** (calificación, desbloqueo, intentos, repaso, certificado, gamificación, arquetipos) — sin React, testeada con vitest, y sin llamar al repositorio (recibe datos ya cargados). Si vas a cambiar una regla de negocio, es casi seguro que vive ahí — y no depende de qué backend esté activo.
- **View-models en `src/lib/student/` y `src/lib/teacher/`** — las páginas nunca calculan lógica inline, llaman a un `buildXxxView(repo, ...)` que arma el objeto que la pantalla necesita.
- **Tipos del dominio en `src/lib/domain/types.ts`** — es el contrato central. Todo modelo nuevo empieza ahí; el esquema de Supabase (`supabase/migrations/0001_schema.sql`) es un espejo 1:1 en snake_case.
- **Auth bifurca por modo, transparente para la app**: `AuthContext.tsx` expone la misma API (`user`, `loading`, `loginAs`, `logout`) sin importar el modo — internamente usa `MockRepository.setCurrentUser()` en mock, o la sesión real de Supabase (`onAuthStateChange` + tabla `profiles`) en modo Supabase.
- **Protección de rutas**: `useRequireAuth` (cliente) sigue existiendo en ambos modos; en modo Supabase además hay un `src/middleware.ts` real que protege server-side antes de que la página cargue (en mock no hace nada, no puede ver la sesión que vive en memoria del cliente).

## Backend real (Supabase)

- **Esquema**: `supabase/migrations/0001_schema.sql` (26 tablas, 1:1 con `domain/types.ts`) + `0002_rls.sql` (RLS por tabla + función `is_teacher()` + trigger `handle_new_user` que asigna rol al crear cuenta). Se corren a mano en el SQL Editor de Supabase — no hay CLI vinculado.
- **Principio de las políticas RLS**: paridad con `MockRepository` (que hoy no filtra lecturas — cada sesión tiene todo el seed en memoria). Contenido de cursos/evaluaciones: lectura abierta a cualquier autenticado, escritura solo profesor. Datos personales (progreso, intentos, mensajes, perfil): dueño o profesor. Certificados: lectura pública (la página `/verify/[code]` es explícitamente pública).
- **Seed**: `scripts/seed-supabase.ts` reutiliza `src/lib/data/mock/seed.ts` directamente (no lo duplica) e inserta todo en Supabase real, incluyendo cuentas reales de Auth para los 6 usuarios del seed (los 4 estudiantes de relleno también, por la FK `profiles.id → auth.users.id`). Idempotente (upsert). Se corre con: `node --experimental-strip-types --env-file=.env.local scripts/seed-supabase.ts`.
- **Pendiente de tu lado**: SMTP propio para el envío de OTP (por ahora usa el límite por defecto de Supabase, bajo, suficiente para probar con pocas cuentas) y configurar el proveedor Google OAuth en el dashboard si se quiere usar "Continuar con Google" en modo Supabase.

## Estado actual (M0–M9, todo completo)

- **Estudiante**: login/OTP → onboarding (campos fijos + personalizados por el profesor) → dashboard (racha, ánimo diario, voces de comunidad reales) → cursos con sesiones/módulos (video/HTML) → quizzes y diagnósticos con retro por RA → certificado (PNG descargable, verificable en `/verify/[code]`) → comunidad real (posts/likes/respuestas) → tutoriales (con quiz opcional simple) → mensajes/calendario.
- **Profesor**: dashboard filtrable por curso → CRUD de cursos (con inscripciones abiertas/cerradas), sesiones, módulos → constructor de quiz/diagnóstico (con RA, o Arquetipos si es onboarding de intereses) → constructor de tutoriales + su quiz → estudiantes (buscador + detalle + inscribir/desinscribir) → calificaciones + CSV → comunidad → configuración (áreas, campos de onboarding).
- **Fachada a propósito (no tocar sin decidirlo primero)**: Proyectos, Retos, XP/créditos. "Competiciones" se eliminó (M9), no se usará por ahora.

## Pendientes conocidos

- **Login real por persona**: resuelto en modo Supabase (cada correo = cuenta real). Sigue sin resolver en modo mock, a propósito (es el comportamiento original del MVP). No hay `teacherId` en `Course` (un solo profesor, como pide la spec).
- **Inscripción masiva**: el profesor inscribe de a uno.
- **XP/créditos**: fachada, a propósito — dependen de que retos/tutoriales tengan seguimiento propio, que hoy es mínimo.
- **SMTP propio y Google OAuth**: pendientes de configurar en el dashboard de Supabase cuando se quiera usar con más de un puñado de cuentas reales (ver "Backend real" arriba).

Para el detalle completo de cada decisión, bug encontrado y por qué se hizo así, [140826-planspec.md](140826-planspec.md) es la fuente de verdad.
