# EQUIdata — Especificación de diseño (MVP)

> **Insumo.** Esta especificación parte de `CLAUDE.md` (brainstorming del 13/08/2026) y de las decisiones tomadas en la sesión de spec del mismo día. Está escrita desde la perspectiva del usuario. Lo que quede sin confirmar aparece marcado como `[pendiente]`.

---

## 1. Overview

**EQUIdata** es una plataforma web de e-learning para enseñar **estadística aplicada a estudios del desarrollo y género**, de uso interno de la Fundación WWB Colombia. Tagline: *"Aprende. Analiza. Transforma."*

Los **estudiantes** recorren cursos organizados en sesiones y módulos (video o HTML interactivo), rinden un diagnóstico inicial, resuelven quizes que van abriendo las siguientes sesiones, y cierran con un diagnóstico final que —si lo aprueban— habilita su certificado. Un **profesor/admin** diseña esos cursos y evaluaciones y sigue el avance de sus estudiantes.

Esta versión es un **MVP local, sin base de datos**, construido como **esqueleto real del producto**: los datos viven en memoria/mock, pero el modelo y la capa de acceso a datos se diseñan para que, cuando llegue **Supabase**, solo se reemplace la fuente de datos sin rehacer pantallas ni lógica. El foco de esta ronda, en orden: **diseño on-brand**, **mapa de navegación** completo (estudiante + profesor) y **lógica** de cursos, progreso, quizes y diagnósticos.

## 2. Usuario objetivo

Dos perfiles, ambos colaboradores de la Fundación.

**Estudiante (usuario principal).** Colaborador que cursa contenidos de estadística en el marco de estudios del desarrollo y género. No necesariamente tiene formación estadística previa —por eso importa medir su punto de partida con un diagnóstico y guiarlo sobre dónde enfocar. Entra con su correo institucional, recorre los cursos en los que está inscrito, resuelve evaluaciones, sigue su progreso en un dashboard y recibe mensajes del profesor y de compañeros. Ejemplo de perfil: *Valentina Mendoza, Analista de Proyectos Sociales, sede Cali*.

**Profesor / Admin (una sola cuenta, todos los permisos).** Persona que diseña los cursos y su contenido, arma las evaluaciones, sigue el avance de sus estudiantes desde un tablero, envía mensajes y descarga calificaciones en CSV para revisarlas por fuera. No hay un rol de administrador separado: es la misma persona con todos los permisos. Ejemplo de perfil: *Valentina Vélez, Profesora*.

## 3. Contexto del problema

Enseñar estadística a públicos de ciencias sociales y estudios de género tiene una dificultad conocida: **la heterogeneidad de puntos de partida** y la dificultad de mostrarle a cada persona, de forma concreta, en qué debe enfocarse. Las herramientas genéricas de e-learning entregan cursos y notas, pero rara vez miden el cambio de una persona respecto de su propio punto de inicio ni conectan el desempeño con el contenido a reforzar.

Hoy, sin una herramienta propia, el profesor arma contenido y quizes por separado, califica y da retroalimentación de forma manual y dispersa, y no tiene una vista consolidada de quién avanza, quién se atasca y en qué. El estudiante recibe una nota, pero no una guía accionable ni una experiencia que lo acompañe.

EQUIdata resuelve eso con un recorrido secuencial y condicionado (las sesiones se abren al aprobar el quiz previo), un diseño **pre/post** (diagnóstico inicial vs. final) y un panel donde el profesor ve todo el avance en un solo lugar.

## 4. Alcance de la versión 1

El alcance se corta por **profundidad**: qué se construye de verdad, qué mínimo, qué como fachada. Esto es deliberado para que la base aguante sin desbordarse hacia lo cosmético.

### 4.1 Real — lógica y modelo de datos completos

- **Autenticación (simulada)**: login con correo institucional + código OTP de 6 dígitos, o "continuar con Google". En el MVP no hay backend de auth; el flujo se recorre con validación mock.
- **Onboarding**: al primer ingreso, el estudiante completa su perfil una vez (nombres, apellidos, cargo, área/programa, sede).
- **Cursos → sesiones → módulos**, con orden explícito en sesiones y en módulos. Módulos de dos tipos: **video embebido** y **HTML embebido** (este último renderizado aislado).
- **Progreso** del estudiante por módulo y por sesión.
- **Evaluaciones** (diagnóstico inicial, quizes intermedios, diagnóstico final) con sus preguntas, intentos (configurables por el profesor), respuestas y calificación. Reglas en la sección 5.4.
- **Resultados de aprendizaje (RA) y retroalimentación por dimensión**: cada evaluación se organiza en RA con un nivel esperado; cada pregunta se asocia a un RA; al terminar, el estudiante ve su desempeño por dimensión (esperado vs. logrado) y qué reforzar. Habilita la comparación pre/post diagnóstico inicial→final (ver 5.4.1).
- **Desbloqueo de sesiones por doble condición**: una sesión se abre cuando llegó su **fecha de liberación** *y* se aprobó el **quiz de la sesión anterior** (ver 5.5).
- **Configuración de la evaluación y del curso por el profesor**: número de intentos por evaluación y fecha de liberación por sesión (ver 5.11).
- **Dashboard del estudiante** conectado al progreso real: "sigue donde lo dejaste", cursos en progreso con %, próximos eventos, sección "en repaso".
- **Panel del profesor completo**: dashboard con métricas; crear/editar curso, sesiones, módulos; crear diagnóstico inicial y final; crear quizes y ubicarlos; **calificaciones con descarga a CSV**; **mini dashboard de progreso** de estudiantes.
- **Mensajes**: profesor→estudiante y compañeros→estudiante. Modelo simple.

### 4.2 Real pero mínimo — modelo definido, desarrollo superficial

- **Calendario**: sin modelo propio. Vista de solo lectura que agrega fechas ya existentes (desbloqueos, fechas de evaluación, entregas). No se crean eventos sueltos en esta versión.
- **Tutoriales rápidos**: reusan el mismo tipo de módulo (HTML/video) pero viven sueltos, fuera de la jerarquía curso→sesión. Pantalla que los lista y reproduce; sin categorías, búsqueda ni filtros por ahora.
- **Sesiones de repaso (Opción B)**: sin modelo nuevo. El repaso se **calcula** desde el progreso. Al terminar la sesión *N*, se muestran como repaso los módulos ya existentes de las sesiones *N* y *N-1* (terminó la 4 → repaso de 4 y 3). El profesor no escribe contenido extra.

### 4.3 Fachada navegable — datos quemados, sin modelo

- **Proyectos de comunidad, Comunidad, Retos, Competiciones**: pantallas navegables con contenido de ejemplo real, sin lógica ni modelo.
- **Gamificación del dashboard**: racha de días, XP, créditos, estado de ánimo, "voces de la comunidad". Números quemados. Sus reglas se definen después (ver 8, pendientes).

### 4.4 Fuera de alcance de esta versión

- Persistencia real / backend / Supabase (llega en una ronda posterior; el MVP deja la capa de datos aislada y lista para conectarla).
- Calificación automática de respuestas abiertas (se revisan por fuera; quedan registradas).
- Generación real del **certificado** como archivo (PDF/imagen). En esta versión se diseña el **estado** "certificado disponible/bloqueado" y su pantalla, pero la emisión del documento queda `[pendiente]` de alcance.
- Envío de correos reales (OTP, notificaciones): el flujo se simula.
- App móvil nativa (es web; debe ser responsive).

## 5. Comportamiento esperado

Descrito como lo vive el usuario.

### 5.1 Ingreso y onboarding (estudiante)

La persona abre EQUIdata y ve la pantalla de **login** (paso 1 de 3): escribe su correo institucional y pide un código de acceso, o elige "continuar con Google". Si pidió código, pasa a **"Confirma que eres tú"** (paso 1 de 3 en los mockups): ingresa el código de 6 dígitos; puede reenviarlo si no llegó. La primera vez, continúa a **"Tu perfil"** (paso 2 de 3): completa nombres y apellidos (texto libre) y elige **cargo, área/programa y sede** de **listas fijas** (desplegables), para que los datos queden limpios y agrupables en las métricas del profesor. La lista de **cargo** ya está definida: *Directoras/Directores · Lideresas/Líderes · Gestoras/Gestores · Auxiliares · Pasantes*. Las listas de **área/programa** y **sede** son también fijas pero están pendientes de que el profesor/admin defina sus opciones (placeholder por ahora). Al confirmar, entra a su **dashboard**. Al terminar, entra a su **dashboard**. En ingresos posteriores, va directo al dashboard.

### 5.2 Dashboard del estudiante

Ve un saludo personalizado ("Hola, Valentina") y un resumen de su actividad. Los elementos:

- **"Sigue donde lo dejaste"**: card destacada con el último curso accedido, su módulo/sesión actual, minutos restantes y un anillo de progreso (%). Botón "Reanudar clase".
- **"En repaso"**: sugerencias de práctica calculadas desde su progreso (ver 5.7).
- **Mis cursos · en progreso**: lista de cursos con % de avance y ubicación (módulo X de Y · día Z de W).
- **Próximos eventos**: leídos del calendario (fechas de talleres, entregas, sesiones).
- **Gamificación** (fachada): racha de días, XP/créditos, estado de ánimo de la semana, voces de la comunidad. Se muestran con datos de ejemplo; no reflejan lógica real todavía.

### 5.3 Recorrido por un curso (vista de curso/sesión)

Al entrar a un curso, la persona ve la cabecera (título, progreso %, "N de M sesiones", profesor) y las **sesiones como cards horizontales** con su estado: **completada** (check lima), **en progreso** (resaltada), o **bloqueada** (candado, "se desbloquea pronto"). Una sesión **bloqueada** muestra su motivo (fecha pendiente o quiz previo no aprobado, ver 5.5). Al seleccionar una sesión abierta, ve sus **módulos** en un panel lateral y el contenido del módulo actual en el centro, con **tabs Video / Recurso HTML**:

- **Módulo de video**: reproductor embebido (p. ej. YouTube), título, descripción, duración.
- **Módulo de HTML**: recurso interactivo embebido y aislado (p. ej. una calculadora de percentiles).

El sistema registra qué módulos completó. Una sesión se considera completada cuando la persona termina todos sus módulos (y, si la sesión tiene quiz, cuando lo aprueba — ver 5.5).

### 5.4 Evaluaciones: diagnósticos y quizes

Hay tres clases de evaluación, todas compuestas por preguntas de cuatro tipos: **opción única** (una correcta), **opción múltiple** (varias correctas), **respuesta abierta** (texto) y **escala 1–10 / ranking**. Las tres primeras y la escala con valor esperado se auto-califican; la **respuesta abierta no puntúa ni da retroalimentación inmediata**: solo queda registrada para que el profesor la revise por fuera (y se pueda exportar en CSV). No se muestra respuesta modelo al enviar.

Reglas por clase. El **número de intentos es configurable por el profesor** en cada evaluación; los valores de la tabla son los **default**:

| Clase | Intentos (default) | Espera entre intentos | Aprobación | Efecto de aprobar |
|---|---|---|---|---|
| **Diagnóstico inicial** | 1 | — | No aplica (solo mide el punto de partida) | Ninguno directo; fija la línea base |
| **Quiz intermedio** | 2 | — | 80% | Aprobar abre la siguiente sesión (con la fecha). Nota: agotar los 2 intentos sin aprobar **también** deja avanzar; la nota de reporte es la **más alta** de los intentos (ver 5.5) |
| **Diagnóstico final** | 2 por ventana de 8 h, **se repite hasta aprobar** | 8 horas entre una tanda de 2 y la siguiente | 80% | Habilita el **certificado** |

Al enviar una evaluación auto-calificable, la persona ve su **puntaje** de inmediato (calculado sobre las preguntas que puntúan; las abiertas quedan aparte). El diagnóstico inicial no se aprueba ni se reprueba: al terminarlo, se desbloquea el recorrido del curso. El **diagnóstico final** se puede reintentar en tandas de 2 intentos separadas por 8 horas, **cuantas veces haga falta hasta alcanzar el 80%** y obtener el certificado. El diagnóstico final se compara contra el inicial mediante los **resultados de aprendizaje** (diseño pre/post, detallado en 5.4.1).

### 5.4.1 Resultados de aprendizaje y retroalimentación por dimensión

Cada evaluación (quiz o diagnóstico) se organiza en **resultados de aprendizaje (RA)** — dimensiones temáticas como "teoría básica", "medidas de tendencia central", "interpretación de resultados". El sistema funciona así:

- **El profesor define los RA de la evaluación** y, para cada uno, un **nivel esperado** (un % objetivo, ej. 60% en "teoría básica").
- **Cada pregunta se asocia a un RA.** Por ejemplo, las preguntas a-b-c responden a RA1 (teoría básica) y las preguntas d-e a RA2 (interpretación). Una pregunta pertenece a un RA.
- Al calificar el intento, el sistema calcula el **desempeño por RA** (el % que la persona logró en las preguntas de cada dimensión), no solo la nota global.

**Lo que ve el estudiante al terminar** (pantalla de resultado):

- Un **encabezado con su resultado global** (puntaje / nivel).
- Un **desglose por RA** que confronta lo esperado con lo logrado: *"Teoría básica — esperábamos 60%, estás en 30%"*, con una barra por dimensión. Las dimensiones donde quedó por debajo del nivel esperado se marcan como **oportunidad de mejora**; las que alcanzó, como **superadas**.
- Una **guía accionable**: qué RA reforzar y —cuando aplique— a qué sesiones/módulos volver.

**Comparación pre/post (diagnóstico inicial → final).** El diagnóstico inicial fija el **punto de partida por RA**. Al rendir el diagnóstico final, el estudiante ve, por cada RA, **dónde empezó y dónde quedó** (formato "hoy → después del curso"), qué dimensiones **superó** y cuáles siguen como **oportunidad de mejora**. Esta es la retroalimentación pre/post concreta del curso.

> Referencia visual (solo estilo): las capturas LAB10 que muestran "esperábamos X, estás en Y" y las barras "0 → 92" por dimensión son la *inspiración de formato* para esta pantalla; se re-viste con la identidad EQUIdata (navy/lima/coral), no se copia el look oscuro morado.

### 5.5 Desbloqueo de sesiones (doble condición: fecha + quiz)

El diagnóstico inicial es la puerta de entrada: hasta completarlo, el contenido del curso permanece bloqueado. Después, **una sesión se abre solo cuando se cumplen las dos condiciones**:

1. **Fecha de liberación alcanzada** — la fecha que el profesor fijó para esa sesión ya llegó.
2. **Quiz anterior resuelto** — la persona ya pasó por el quiz de la sesión anterior: **lo aprobó (80%)**, o **agotó sus 2 intentos** aunque no llegara al 80%. En ambos casos el quiz cuenta como resuelto y no bloquea el avance. El quiz nunca deja a nadie en un callejón sin salida: a lo sumo se agotan los intentos, y la persona igual avanza. Para calificaciones y reportes se toma la **nota más alta** de los intentos.

Si falta cualquiera de las dos condiciones, la sesión se muestra con candado y el **motivo específico**: "disponible a partir del 15 de marzo" (falta la fecha) o "resuelve el quiz de la sesión anterior" (aún no lo ha intentado / le quedan intentos y no ha aprobado). La primera sesión, que no tiene quiz previo, se rige solo por su fecha de liberación. El diagnóstico final se habilita en la **última sesión**, siempre que el profesor lo haya activado para ese curso.

### 5.6 Certificado

**Elegibilidad (lógica real desde ahora).** El sistema determina quién tiene derecho al certificado a partir de datos que ya se registran: haber **aprobado el diagnóstico final (≥80%)** y haber **completado el curso** (todas sus sesiones/módulos). Cuando la persona cumple, su curso muestra el **certificado como disponible**; mientras no cumpla, se muestra **bloqueado** con el motivo. El **nombre** del certificado sale del perfil capturado en el onboarding.

**Emisión del archivo (aplazada).** Renderizar el certificado como documento descargable (PDF/imagen) con su diseño queda `[pendiente]` (ver 4.4). No requiere rehacer arquitectura: la elegibilidad, el estado y el nombre ya están resueltos en los datos; cuando se aborde, solo se conecta el render del documento. El diseño gráfico del certificado se hará en su momento.

### 5.7 Sesiones de repaso

En el dashboard, la sección **"En repaso"** ofrece práctica sugerida sin que el profesor cargue nada extra. La regla: tras completar la sesión *N*, se re-presentan como repaso los módulos ya existentes de las sesiones *N* y *N-1*. Ejemplos: terminó la sesión 4 → repaso de 4 y 3; terminó la 6 → repaso de 6 y 5.

### 5.8 Tutoriales rápidos

Sección propia en el sidebar. Lista de mini-módulos (video o HTML interactivo) que no cuelgan de ningún curso. Funcionan como los módulos normales: se abren, se ven/interactúan, y punto. Sin progreso condicionado.

### 5.9 Calendario

Vista de solo lectura que reúne las fechas relevantes del estudiante: desbloqueos de sesión, fechas de evaluación, entregas y eventos (talleres, clínicas de datos). No se crean eventos manualmente en esta versión.

### 5.10 Mensajes

El estudiante recibe y **envía** mensajes, en una bandeja simple: puede leer lo que le llega del profesor y de compañeros, y también escribir/responder a ellos. Es mensajería bidireccional básica (sin adjuntos ni hilos complejos en esta v1).

### 5.11 Panel del profesor/admin

Desde su sidebar (Dashboard · Cursos · Crear curso · Estudiantes · Calificaciones · Progreso · Quizes · Contenido · Mensajes · Configuración), el profesor:

- **Dashboard**: KPIs (estudiantes activos, cursos activos, progreso promedio, quizes realizados); distribución del progreso general (completado / en progreso / en riesgo / no iniciado); rendimiento promedio en el tiempo; tabla "Mis cursos" (estudiantes, progreso promedio, estado, última actualización, acciones); actividad reciente; calendario próximo; acciones rápidas (crear curso, crear quiz, ver calificaciones, exportar CSV).
- **Crear/editar curso**: título, descripción, portada, publicado/borrador; botón **crear diagnóstico inicial** y botón **crear diagnóstico final** (el final se habilita en la última sesión si se activa).
- **Crear sesiones** (con orden) y, dentro de cada una, **crear módulos** (con orden), eligiendo tipo video o HTML embebido. Cada sesión lleva una **fecha de liberación** que el profesor fija (condición de desbloqueo junto con el quiz, ver 5.5).
- **Crear quizes** y **ubicarlos** después del módulo o sesión que decida.
- **Configurar cada evaluación**: define el **número de intentos** de quizes y diagnósticos (una casilla en la creación/edición de la evaluación), sobre los valores default de 5.4.
- **Definir los resultados de aprendizaje (RA)** de cada evaluación y su **nivel esperado** (% objetivo por dimensión), y **asociar cada pregunta a un RA** al crearla. Este es el insumo del sistema de retroalimentación por dimensión que ve el estudiante (ver 5.4.1).
- **Calificaciones**: ver resultados de diagnóstico inicial, quizes y diagnóstico final, con **descarga a CSV**. El CSV puede incluir la nota global y el **desglose por resultado de aprendizaje** (esperado vs. logrado), además de las respuestas abiertas registradas para revisión.
- **Progreso**: mini dashboard del avance de sus estudiantes.
- **Mensajes**: enviar mensajes a estudiantes (individual o por curso).
- **Reabrir intentos**: cuando una persona agotó sus intentos de una evaluación, el profesor puede **reabrir/otorgar intentos** manualmente (por estudiante y evaluación). Entra en la v1.

Nota de consistencia: el panel del profesor **reutiliza la estructura** del mockup existente pero se **re-viste por completo con la identidad EQUIdata** (ver sección 7). El look lavanda/genérico del mockup no se conserva.

## 6. Posibles errores y mitigaciones

- **Código OTP incorrecto o no llega.** El campo muestra error concreto (coral) y ofrece "reenviar código". En el MVP el código es mock; se documenta el código válido para pruebas.
- **HTML embebido roto.** El HTML lo escribe el propio profesor/admin, así que es **contenido de confianza**: no se contempla código malicioso de terceros. El riesgo real es que quede **roto o mal formado**. Mitigación: se renderiza en un contenedor propio (para robustez y aislamiento de estilos) y el profesor puede corregirlo editando el módulo; la app no depende de que ese HTML funcione para seguir operando.
- **Intentos agotados sin aprobar (quiz).** No es un bloqueo: si tras sus 2 intentos la persona no llega al 80%, **igual se le abre la siguiente sesión** (cumplida la fecha). Para calificaciones y reportes se registra la **nota más alta** de los intentos. Así nadie queda trancado por un quiz. Además, el profesor puede **reabrir intentos** manualmente (ver 5.11) si quiere dar otra oportunidad.
- **Fecha de liberación mal configurada.** El profesor puede dejar una fecha en el pasado (la sesión depende solo del quiz) o muy lejana (retrasa el avance). Mitigación: **el profesor siempre puede ajustar la fecha** después; el candado del estudiante explica el motivo mientras tanto.
- **Espera de 8h en el diagnóstico final confusa.** El diagnóstico final se rinde en tandas de 2 intentos; al agotar una tanda sin aprobar, hay que esperar 8 horas para la siguiente, y así hasta lograr el certificado. Mitigación: la interfaz muestra cuántos intentos quedan en la tanda y el momento exacto en que se habilita la siguiente.
- **Sesión bloqueada sin motivo claro.** Mitigación: cada bloqueo muestra su razón específica (diagnóstico inicial pendiente vs. quiz previo no aprobado).
- **Datos reales que rompen el layout.** Nombres largos, 0% de progreso, sesiones bloqueadas, tablas del profesor con muchas filas. Mitigación: el sistema de diseño se valida desde el principio con datos mock variados, no prolijos.
- **Respuesta abierta sin revisar.** No se califica ni da retroalimentación inmediata en la app. Mitigación: queda registrada y trazable (curso/módulo/quiz/pregunta) para que el profesor la revise por fuera y se exporte en CSV. No hay respuesta modelo en pantalla (decisión tomada: la retro inmediata de las abiertas no interesa en esta v1).
- **Confusión entre la vista de estudiante y la de profesor.** Al ser una cuenta específica el profesor, debe quedar claro en qué rol se está. Mitigación: sidebars y encabezados distintos, identidad visual común.
- **La base no aguanta al llegar Supabase.** Si la capa de datos mock no está aislada, conectar Supabase obliga a reescribir pantallas. Mitigación: una sola interfaz de acceso a datos que las pantallas consumen sin saber si detrás hay mock o Supabase; los tipos del modelo se definen desde el día uno.

## 7. Identidad visual (resumen operativo)

La fuente de verdad es `marca-elearning.md` y las pantallas de estudiante en `prototipo/`.

- **Color por rol**: Navy `#192962` (ancla: texto, títulos, nav, CTA sólido) · Lavanda `#BEA4E8` (links, secundarios, tags — nunca CTA ni texto) · Fondo `#FAFAFA`, cards blancas · Lima `#BBEF7F` (acento: progreso, completado, activo — nunca botón) · Coral `#D55947` (un acento hero por pantalla, alertas). Ratio 60/30/10.
- **Tipografía**: títulos **Space Grotesk** 500; cuerpo/UI **Inter**; **etiquetas en monoespaciada MAYÚSCULA** con letter-spacing (la firma anti-genérico).
- **Espaciado** escala 8px; radios 12/16/999px; sombras sutiles de una sola profundidad; botones pill; un solo primario por vista.
- **Anti-AI**: contenido real, 1 acento por pantalla, sin emojis como iconos, sin gradientes morados, sin efecto piñata.
- **Assets**: `assets/logo/` (positivo, duotono, monocromático, negativo, grises, animación).

## 8. Pendientes por confirmar

- `[pendiente]` **Stack de frontend**: se decide en el paso de plan (skill de plan). Supuesto de trabajo: Next.js + React + Tailwind, con capa de datos mock aislada.
- `[pendiente]` **Emisión del certificado como archivo** (PDF/imagen) y su diseño gráfico: aplazado. La elegibilidad y el estado ya son reales (ver 5.6).
- `[pendiente]` **Onboarding — listas de área/programa y sede**: listas fijas, pendientes de que el profesor/admin defina sus opciones. (El **cargo** ya quedó definido, ver 5.1.)
- `[pendiente]` **Reglas de gamificación** (XP, créditos, racha, estado de ánimo) cuando salga de fachada.

*Resueltos en esta ronda:* comparación pre/post (vía RA, 5.4.1), reabrir intentos (v1, 5.11), mensajería bidireccional (5.10), intentos configurables y fecha de liberación (5.4/5.5), elegibilidad del certificado (5.6).

## 9. Métricas de éxito de esta ronda

Esta ronda cumple su objetivo cuando:

1. Las dos experiencias (estudiante y profesor) son **navegables de punta a punta** y se sienten un solo producto bajo la marca EQUIdata.
2. La lógica **real** (cursos, progreso, evaluaciones con sus reglas, desbloqueo de sesiones) funciona con datos mock.
3. El sistema de diseño **aguanta datos variados** (nombres largos, 0% de progreso, sesiones bloqueadas, tablas largas) sin romperse.
4. La **capa de datos está aislada** de modo que conectar Supabase después no obligue a rehacer pantallas.
