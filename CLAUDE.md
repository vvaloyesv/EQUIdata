# EQUIdata

> Especificación de producto (brainstorming 2026-08-13). `[pendiente]` = sin confirmar.

## Qué es

**EQUIdata** — e-learning para enseñar estadística aplicada a estudios del desarrollo y género, uso interno de la Fundación WWB Colombia. Tagline: *"Aprende. Analiza. Transforma."*

Estudiantes recorren cursos (sesiones → módulos), resuelven diagnósticos/quizes, siguen su progreso. Profesor/admin diseña cursos y evaluaciones, sigue el avance de sus estudiantes.

## Objetivo de esta etapa

MVP local, sin base de datos, como **esqueleto real** (no prototipo desechable), en este orden: diseño de marca consistente → mapa de navegación completo (estudiante + profesor) → lógica real de cursos/sesiones/módulos/progreso/quizes con datos en memoria.

**Principio rector: que la base aguante.** Datos en memoria/mock ahora, pero tipos y modelo de datos pensados desde ya detrás de una única capa de acceso a datos, para que Supabase (después) solo reemplace la fuente sin rehacer pantallas ni lógica.

## Usuarios

- **Estudiante**: cursos, diagnósticos/quizes, progreso, mensajes.
- **Profesor/Admin** (una cuenta, todos los permisos): diseña cursos/sesiones/módulos/evaluaciones, ve métricas, descarga calificaciones CSV, envía mensajes.

## Marca y diseño

Fuente de verdad visual: `marca-elearning.md` y las pantallas de estudiante en `prototipo/`. El mockup del profesor (`prototipo/6279a9c4-...png`) **contradice la guía** (lavanda dominante/CTA, sin mono, emoji, efecto piñata) — se recicla su **estructura** (sidebar, KPIs, tabla de cursos, actividad, calendario, acciones rápidas) pero se **re-viste 100% con la marca**.

- **Color por rol** (60/30/10): Navy `#192962` (texto, títulos, nav, CTA) · Lavanda `#BEA4E8` (links/secundarios/tags, nunca CTA) · Fondo `#FAFAFA` · Lima `#BBEF7F` (progreso/completado, nunca botón) · Coral `#D55947` (1 acento hero por pantalla, alertas).
- **Tipografía**: títulos Space Grotesk 500; cuerpo/UI Inter 400/500; microcopy monoespaciada MAYÚSCULA con letter-spacing (`DÍA 1 DE 5`).
- Espaciado 8px; radios 12/16/999px; sombras sutiles.
- Anti-AI: contenido real (no lorem), 1 acento por pantalla, sin emojis-como-icono, sin gradientes/piñata.
- Assets: `assets/logo/` (positivo, duotono, mono, mono negativo, grises, animación mp4).

## Modelo de dominio

```
Curso
 ├─ Diagnóstico inicial   (opcional; 1 intento)
 ├─ Sesión (orden)
 │   ├─ Módulo (orden) — tipo: HTML embebido | video embebido
 │   └─ Quiz intermedio    (opcional)
 └─ Diagnóstico final      (opcional; última sesión, si el profesor lo activó)
```

- Sesiones y módulos tienen orden explícito.
- Quizes y diagnósticos comparten estructura (evaluación → preguntas → intentos → respuestas → calificación); se distinguen por tipo/clase y reglas propias (intentos, ubicación, habilitación).
- HTML embebido se renderiza aislado (permisos restringidos), para que el código de autor no afecte la sesión.

## Alcance por profundidad

**A. Real** (lógica y modelo completos): cursos→sesiones→módulos con orden; progreso por módulo/sesión; diagnósticos y quizes (preguntas/intentos/respuestas/calificación); dashboard de estudiante conectado a progreso real; panel de profesor completo (crear curso/sesión/módulo/quiz, calificaciones + descarga CSV, mini dashboard de progreso); mensajes (profesor→estudiante, compañero→estudiante).

**B. Real pero mínimo** (modelo definido, desarrollo superficial):
- **Calendario**: sin modelo propio, vista de solo lectura sobre fechas ya existentes en cursos/quizes.
- **Tutoriales**: reusan el tipo `Modulo`, sueltos fuera de la jerarquía curso→sesión, sin filtros por ahora.
- **Repaso** (Opción B): sin modelo nuevo — al terminar la sesión *N*, se muestran como repaso los módulos ya existentes de *N* y *N-1*. Sin contenido extra del profesor.

**C. Fachada** (datos quemados, sin modelo): Proyectos de comunidad, Comunidad, Retos, Competiciones (navegables, contenido de ejemplo real); gamificación del dashboard (racha, XP, créditos, ánimo, voces de la comunidad) con números quemados — sus reglas se definen después, cuando esté claro qué comportamiento premiar.

**Respetar este corte**: A se construye de verdad, C se dibuja y no se toca más.

## Mapa de navegación

**Sidebar estudiante**: Dashboard · Mis cursos · Calendario · Proyectos · Comunidad · Retos · Competiciones · Tutoriales.
**Sidebar profesor**: Dashboard · Cursos · Crear curso · Estudiantes · Calificaciones · Progreso · Quizes · Contenido · Mensajes · Configuración.

Pantallas de estudiante ya diseñadas en `prototipo/`: Login (correo institucional + OTP o Google) → OTP (6 dígitos) → Perfil/onboarding (nombres, apellidos, cargo, área, sede) → Dashboard (sigue-donde-lo-dejaste con progreso circular, cursos en progreso, próximos eventos, repaso, gamificación fachada) → Vista curso/sesión (cards horizontales de sesiones, tabs Video/Recurso HTML, reproductor embebido, panel lateral de módulos).

Dashboard profesor (esbozado, reciclar estructura y re-vestir con marca): KPIs (estudiantes activos, cursos, progreso promedio, quizes), dona de progreso general, línea de rendimiento promedio, tabla "Mis cursos", actividad reciente, calendario próximo, acciones rápidas (crear curso/quiz, ver calificaciones, exportar CSV).

## Stack

- **Frontend**: `[pendiente]` — probablemente Next.js + React + Tailwind, con capa de datos mock aislada (interfaz de acceso a datos que después se conecta a Supabase).
- **Backend/datos (después)**: Supabase (Postgres + Auth + Storage, con RLS) — no en esta ronda.
- **Ahora**: datos en memoria/mock, sin persistencia real.

## Riesgos y mitigaciones

1. **Diseño se fractura estudiante/profesor** → definir tokens de marca primero, construir todo encima, validar el panel de profesor contra la guía antes de generalizar patrones.
2. **La capa mock no aguanta cuando llegue Supabase** → una sola interfaz de acceso a datos (repositorios/servicios); tipos del modelo definidos desde el día uno.
3. **El alcance se desborda hacia la fachada** → respetar el corte A/B/C de arriba.

## Próximo paso de validación

Definir los tokens de marca (color, tipografía, espaciado, componentes core: sidebar, cards, tabs, botones, estados de progreso) y rediseñar con ellos **una sola pantalla** — dashboard de estudiante o vista de curso/sesión — con datos mock realistas y variados (nombres largos, 0% de progreso, sesión bloqueada). Si aguanta esos casos, se replica al resto.

## Pendientes por confirmar

- `[pendiente]` Stack de frontend definitivo (Next.js asumido).
- `[pendiente]` Reglas de evaluaciones: intentos por tipo, % de aprobación, espera entre intentos, tipos de pregunta soportados. (`app-elearning` es referencia, no se copia: se decide para EQUIdata.)
- `[pendiente]` Listas fijas de cargo/área/sede del onboarding.
- `[pendiente]` Reglas de gamificación (cuando salga de fachada).
