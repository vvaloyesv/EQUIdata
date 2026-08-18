/**
 * Datos semilla en memoria.
 *
 * Deliberadamente VARIADOS para estresar el sistema de diseño (spec §9):
 * - un estudiante con nombre largo,
 * - un curso a 0% de progreso,
 * - una sesión bloqueada por fecha futura,
 * - varias filas para las tablas del profesor.
 *
 * Fechas: se usan ISO fijas (no Date.now()) para que la semilla sea estable.
 * "Ahora" de referencia para la demo: 2026-08-13.
 */

import type {
  Answer,
  Attempt,
  Certificate,
  Challenge,
  CommunityLike,
  CommunityPost,
  CommunityReply,
  Course,
  Enrollment,
  Evaluation,
  LearningOutcome,
  Message,
  Module,
  ModuleProgress,
  OutcomeScore,
  Question,
  QuestionOption,
  Session,
  StudentProfile,
  User,
} from "@/lib/domain/types";

export const NOW_ISO = "2026-08-13T12:00:00.000Z";

// ————————————————————————————————————————————————
// Usuarios
// ————————————————————————————————————————————————

export const users: User[] = [
  {
    id: "u-student",
    email: "valentina.mendoza@fundacionwwbcol.org",
    role: "student",
    displayName: "Valentina",
    lastSeen: "2026-08-13T11:40:00.000Z",
  },
  {
    id: "u-teacher",
    email: "vvaloyes@fundacionwwbcol.org",
    role: "teacher",
    displayName: "Valentina Vélez",
    lastSeen: "2026-08-13T11:55:00.000Z",
  },
  // Estudiantes extra para poblar tablas del profesor (uno con nombre largo).
  {
    id: "u-s2",
    email: "juan.rojas@fundacionwwbcol.org",
    role: "student",
    displayName: "Juan Camilo",
    lastSeen: "2026-08-13T09:10:00.000Z",
  },
  {
    id: "u-s3",
    email: "maria.gonzalez@fundacionwwbcol.org",
    role: "student",
    displayName: "María Fernanda",
    lastSeen: "2026-08-12T18:00:00.000Z",
  },
  {
    id: "u-s4",
    email: "ana.maria.delpilar@fundacionwwbcol.org",
    role: "student",
    displayName: "Ana María del Pilar Guzmán Restrepo de la Hoz",
    lastSeen: "2026-08-11T14:30:00.000Z",
  },
  {
    id: "u-s5",
    email: "laura.mendez@fundacionwwbcol.org",
    role: "student",
    displayName: "Laura",
    lastSeen: "2026-08-13T08:00:00.000Z",
  },
];

export const studentProfiles: StudentProfile[] = [
  {
    userId: "u-student",
    nombres: "Valentina",
    apellidos: "Mendoza",
    cargo: "Gestoras/Gestores",
    area: "Investigación",
    documentType: "CC",
    documentNumber: "1020304050",
    completed: true,
  },
];

// ————————————————————————————————————————————————
// Cursos
// ————————————————————————————————————————————————

export const courses: Course[] = [
  {
    id: "c-estadistica",
    title: "Fundamentos de Estadística Descriptiva",
    description:
      "Mide, describe e interpreta datos de programas sociales con enfoque de desarrollo y género.",
    certificateDescription:
      "dominando las medidas de tendencia central y dispersión, y aprendiendo a interpretar datos de programas sociales con enfoque de desarrollo y género.",
    certificateDurationHours: 4,
    published: true,
    enrollmentOpen: true,
    teacherName: "Diego Fercho",
  },
  {
    id: "c-python",
    title: "Introducción a Python para análisis",
    description:
      "Del cero a manipular datos con pandas para análisis territorial.",
    published: true,
    enrollmentOpen: true,
    teacherName: "Valentina Vélez",
  },
  {
    id: "c-genero",
    title: "Análisis de datos con perspectiva de género",
    description:
      "Diseño de indicadores sensibles al género y lectura crítica de brechas.",
    published: true,
    enrollmentOpen: true,
    teacherName: "Valentina Vélez",
  },
];

// ————————————————————————————————————————————————
// Sesiones (curso de estadística — el que tiene progreso)
// ————————————————————————————————————————————————

export const sessions: Session[] = [
  {
    id: "s1",
    courseId: "c-estadistica",
    order: 1,
    title: "Introducción y ecosistema de datos",
    unlockDate: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "s2",
    courseId: "c-estadistica",
    order: 2,
    title: "Estadística en el trabajo social",
    unlockDate: "2026-07-22T00:00:00.000Z",
  },
  {
    id: "s3",
    courseId: "c-estadistica",
    order: 3,
    title: "Medidas de tendencia central",
    unlockDate: "2026-07-29T00:00:00.000Z",
  },
  {
    id: "s4",
    courseId: "c-estadistica",
    order: 4,
    title: "Dispersión y variabilidad",
    // Fecha futura respecto a NOW → bloqueada por fecha.
    unlockDate: "2026-09-15T00:00:00.000Z",
  },
  {
    id: "s5",
    courseId: "c-estadistica",
    order: 5,
    title: "Visualización y storytelling",
    unlockDate: "2026-09-29T00:00:00.000Z",
  },
  // Curso de python — 0% de progreso (caso límite: estado vacío).
  {
    id: "sp1",
    courseId: "c-python",
    order: 1,
    title: "Primeros pasos con Python",
    unlockDate: "2026-08-01T00:00:00.000Z",
  },
];

// ————————————————————————————————————————————————
// Módulos
// ————————————————————————————————————————————————

export const modules: Module[] = [
  // Sesión 3 (en progreso) — video + html
  {
    id: "m-s3-1",
    sessionId: "s3",
    context: "course",
    order: 1,
    type: "video",
    title: "Media, mediana y moda en acción",
    description:
      "Calcula e interpreta las tres medidas de tendencia central con datos reales de encuestas territoriales de la Fundación.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMin: 4,
  },
  {
    id: "m-s3-2",
    sessionId: "s3",
    context: "course",
    order: 2,
    type: "html",
    title: "Calculadora de percentiles",
    description:
      "Recurso interactivo: ingresa un conjunto de datos y observa cómo cambian los percentiles.",
    contentHtml: `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:system-ui;margin:0;padding:24px;color:#192962;background:#fff}
      h2{font-size:18px;margin:0 0 12px}
      input{font-size:16px;padding:8px;width:100%;box-sizing:border-box;border:1px solid #edeef2;border-radius:12px}
      .out{margin-top:16px;padding:16px;background:#f1fadf;border-radius:12px}
      .big{font-size:32px;font-weight:600}
    </style></head><body>
      <h2>Calculadora de percentiles</h2>
      <input id="d" value="4, 8, 15, 16, 23, 42" />
      <div class="out">Percentil 50 (mediana): <span class="big" id="p50">—</span></div>
      <script>
        const el=document.getElementById('d');const out=document.getElementById('p50');
        function calc(){const xs=el.value.split(',').map(s=>parseFloat(s.trim())).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
        if(!xs.length){out.textContent='—';return}const mid=Math.floor(xs.length/2);
        out.textContent=(xs.length%2?xs[mid]:((xs[mid-1]+xs[mid])/2)).toFixed(1)}
        el.addEventListener('input',calc);calc();
      </script>
    </body></html>`,
    durationMin: 8,
  },
  // Sesiones 1 y 2 (completadas) — un módulo cada una
  {
    id: "m-s1-1",
    sessionId: "s1",
    context: "course",
    order: 1,
    type: "video",
    title: "¿Qué es un dato?",
    description: "El punto de partida: de la realidad social al dato.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMin: 4,
  },
  {
    id: "m-s2-1",
    sessionId: "s2",
    context: "course",
    order: 1,
    type: "html",
    title: "Tipos de variables (interactivo)",
    description: "Clasifica variables de un dataset real.",
    contentHtml: `<!doctype html><html><body style="font-family:system-ui;color:#192962;padding:24px">
      <h2 style="font-size:18px">Tipos de variables</h2>
      <p>Cuantitativa, cualitativa, ordinal… un mini-ejercicio de clasificación.</p>
    </body></html>`,
    durationMin: 6,
  },
  // Sesión 4 (bloqueada) — tiene contenido pero no se ve hasta desbloquear
  {
    id: "m-s4-1",
    sessionId: "s4",
    context: "course",
    order: 1,
    type: "video",
    title: "Rango, varianza y desviación",
    description: "Qué tan dispersos están los datos.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMin: 4,
  },
  // Tutoriales rápidos (sueltos)
  {
    id: "t-1",
    sessionId: null,
    context: "tutorial",
    order: 1,
    type: "video",
    title: "Manipulación de datos con pandas",
    description: "Un repaso veloz de las operaciones más usadas.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    durationMin: 4,
  },
  {
    id: "t-2",
    sessionId: null,
    context: "tutorial",
    order: 2,
    type: "html",
    title: "Cálculo del IDH paso a paso",
    description: "Interactivo: arma el Índice de Desarrollo Humano.",
    contentHtml: `<!doctype html><html><body style="font-family:system-ui;color:#192962;padding:24px">
      <h2 style="font-size:18px">IDH paso a paso</h2><p>Salud, educación e ingreso combinados.</p></body></html>`,
    durationMin: 25,
  },
];

// ————————————————————————————————————————————————
// Inscripciones
// ————————————————————————————————————————————————

export const enrollments: Enrollment[] = [
  { userId: "u-student", courseId: "c-estadistica", enrolledAt: "2026-07-10T00:00:00.000Z" },
  { userId: "u-student", courseId: "c-python", enrolledAt: "2026-08-05T00:00:00.000Z" },
  { userId: "u-s2", courseId: "c-estadistica", enrolledAt: "2026-07-11T00:00:00.000Z" },
  { userId: "u-s3", courseId: "c-estadistica", enrolledAt: "2026-07-11T00:00:00.000Z" },
  { userId: "u-s4", courseId: "c-estadistica", enrolledAt: "2026-07-12T00:00:00.000Z" },
  { userId: "u-s5", courseId: "c-estadistica", enrolledAt: "2026-07-12T00:00:00.000Z" },
];

// ————————————————————————————————————————————————
// Progreso de módulos (del estudiante principal)
// Sesiones 1 y 2 completas; sesión 3 en progreso (video sí, html no).
// ————————————————————————————————————————————————

export const moduleProgress: ModuleProgress[] = [
  { userId: "u-student", moduleId: "m-s1-1", completed: true, completedAt: "2026-07-16T00:00:00.000Z" },
  { userId: "u-student", moduleId: "m-s2-1", completed: true, completedAt: "2026-07-23T00:00:00.000Z" },
  { userId: "u-student", moduleId: "m-s3-1", completed: true, completedAt: "2026-08-12T00:00:00.000Z" },
  { userId: "u-student", moduleId: "m-s3-2", completed: false },
  // c-python queda a 0% a propósito.
];

// ————————————————————————————————————————————————
// Evaluaciones + RA + preguntas (curso de estadística)
// ————————————————————————————————————————————————

export const evaluations: Evaluation[] = [
  {
    id: "e-diag-ini",
    courseId: "c-estadistica",
    kind: "diagnostic_initial",
    title: "Diagnóstico inicial",
    maxAttempts: 1,
    waitHours: 0,
    isActive: true,
  },
  {
    id: "e-quiz-s3",
    courseId: "c-estadistica",
    sessionId: "s3",
    kind: "quiz",
    title: "Quiz — Medidas de tendencia central",
    maxAttempts: 2,
    waitHours: 0,
    passingScore: 80,
    isActive: true,
    placementAfterModuleId: "m-s3-2",
  },
  {
    id: "e-diag-fin",
    courseId: "c-estadistica",
    kind: "diagnostic_final",
    title: "Diagnóstico final",
    maxAttempts: 2,
    waitHours: 8,
    passingScore: 80,
    isActive: true,
  },
];

export const outcomes: LearningOutcome[] = [
  { id: "ra1", evaluationId: "e-quiz-s3", code: "RA1", name: "Teoría básica", expectedLevel: 60 },
  { id: "ra2", evaluationId: "e-quiz-s3", code: "RA2", name: "Interpretación de resultados", expectedLevel: 70 },
  // Diagnósticos comparten las mismas dimensiones para habilitar el pre/post.
  { id: "ra1-ini", evaluationId: "e-diag-ini", code: "RA1", name: "Teoría básica", expectedLevel: 60 },
  { id: "ra2-ini", evaluationId: "e-diag-ini", code: "RA2", name: "Interpretación de resultados", expectedLevel: 70 },
  { id: "ra1-fin", evaluationId: "e-diag-fin", code: "RA1", name: "Teoría básica", expectedLevel: 60 },
  { id: "ra2-fin", evaluationId: "e-diag-fin", code: "RA2", name: "Interpretación de resultados", expectedLevel: 70 },
];

export const questions: Question[] = [
  // Diagnóstico inicial
  {
    id: "qi1",
    evaluationId: "e-diag-ini",
    order: 1,
    type: "single",
    text: "¿Cuál medida de tendencia central es más sensible a valores extremos?",
    points: 1,
    outcomeId: "ra1-ini",
  },
  {
    id: "qi2",
    evaluationId: "e-diag-ini",
    order: 2,
    type: "scale",
    text: "Del 1 al 10, ¿qué tan cómoda te sientes interpretando estadística descriptiva?",
    points: 0,
    outcomeId: "ra2-ini",
  },
  // Diagnóstico final (mismas dimensiones, para el pre/post)
  {
    id: "qf1",
    evaluationId: "e-diag-fin",
    order: 1,
    type: "single",
    text: "¿Cuál medida de tendencia central es más sensible a valores extremos?",
    points: 1,
    outcomeId: "ra1-fin",
  },
  {
    id: "qf2",
    evaluationId: "e-diag-fin",
    order: 2,
    type: "multiple",
    text: "¿Cuáles de las siguientes son medidas de tendencia central?",
    points: 1,
    outcomeId: "ra1-fin",
  },
  {
    id: "qf3",
    evaluationId: "e-diag-fin",
    order: 3,
    type: "open",
    text: "Explica con tus palabras cuándo preferirías la mediana sobre la media.",
    points: 0,
    outcomeId: "ra2-fin",
  },
  // Quiz de la sesión 3
  {
    id: "q1",
    evaluationId: "e-quiz-s3",
    order: 1,
    type: "single",
    text: "¿Cuál medida de tendencia central es más sensible a valores extremos?",
    points: 1,
    outcomeId: "ra1",
  },
  {
    id: "q2",
    evaluationId: "e-quiz-s3",
    order: 2,
    type: "multiple",
    text: "¿Cuáles de las siguientes son medidas de tendencia central?",
    points: 1,
    outcomeId: "ra1",
  },
  {
    id: "q3",
    evaluationId: "e-quiz-s3",
    order: 3,
    type: "open",
    text: "Explica con tus palabras cuándo preferirías la mediana sobre la media.",
    points: 0,
    outcomeId: "ra2",
  },
  {
    id: "q4",
    evaluationId: "e-quiz-s3",
    order: 4,
    type: "scale",
    text: "Del 1 al 10, ¿qué tan segura te sientes interpretando estas medidas?",
    points: 0,
    outcomeId: "ra2",
  },
];

export const questionOptions: QuestionOption[] = [
  { id: "oi1a", questionId: "qi1", text: "La media", isCorrect: true },
  { id: "oi1b", questionId: "qi1", text: "La mediana", isCorrect: false },
  { id: "oi1c", questionId: "qi1", text: "La moda", isCorrect: false },
  { id: "of1a", questionId: "qf1", text: "La media", isCorrect: true },
  { id: "of1b", questionId: "qf1", text: "La mediana", isCorrect: false },
  { id: "of1c", questionId: "qf1", text: "La moda", isCorrect: false },
  { id: "of2a", questionId: "qf2", text: "Media", isCorrect: true },
  { id: "of2b", questionId: "qf2", text: "Mediana", isCorrect: true },
  { id: "of2c", questionId: "qf2", text: "Desviación estándar", isCorrect: false },
  { id: "of2d", questionId: "qf2", text: "Moda", isCorrect: true },
  { id: "o1a", questionId: "q1", text: "La media", isCorrect: true },
  { id: "o1b", questionId: "q1", text: "La mediana", isCorrect: false },
  { id: "o1c", questionId: "q1", text: "La moda", isCorrect: false },
  { id: "o2a", questionId: "q2", text: "Media", isCorrect: true },
  { id: "o2b", questionId: "q2", text: "Mediana", isCorrect: true },
  { id: "o2c", questionId: "q2", text: "Desviación estándar", isCorrect: false },
  { id: "o2d", questionId: "q2", text: "Moda", isCorrect: true },
];

/**
 * El estudiante ya rindió el diagnóstico inicial (coherente con que ya
 * avanzó hasta la sesión 3). Sirve de línea base para el pre/post del
 * diagnóstico final, y desbloquea el curso (diagnosticDone = true).
 */
export const attempts: Attempt[] = [
  {
    id: "att-diag-ini-1",
    userId: "u-student",
    evaluationId: "e-diag-ini",
    startedAt: "2026-07-10T00:10:00.000Z",
    submittedAt: "2026-07-10T00:40:00.000Z",
    score: 45,
    status: "submitted",
  },
];

export const answers: Answer[] = [
  {
    id: "ans-diag-ini-1",
    attemptId: "att-diag-ini-1",
    questionId: "qi1",
    selectedOptionIds: ["oi1b"],
    pointsAwarded: 0,
    isCorrect: false,
  },
  {
    id: "ans-diag-ini-2",
    attemptId: "att-diag-ini-1",
    questionId: "qi2",
    scaleValue: 4,
  },
];

export const outcomeScores: OutcomeScore[] = [
  { attemptId: "att-diag-ini-1", outcomeId: "ra1-ini", expected: 60, achieved: 30 },
];

// ————————————————————————————————————————————————
// Mensajes
// ————————————————————————————————————————————————

export const messages: Message[] = [
  {
    id: "msg-1",
    fromUserId: "u-teacher",
    toUserId: "u-student",
    courseId: "c-estadistica",
    body: "Hola Valentina, recuerda que el quiz de la sesión 3 abre la siguiente sesión. ¡Vas muy bien!",
    createdAt: "2026-08-12T15:00:00.000Z",
    read: false,
  },
  {
    id: "msg-2",
    fromUserId: "u-s2",
    toUserId: "u-student",
    body: "¿Hiciste ya la calculadora de percentiles? Me sirvió un montón.",
    createdAt: "2026-08-13T09:30:00.000Z",
    read: true,
  },
];

// ————————————————————————————————————————————————
// Certificados
// Uno de ejemplo, con código fijo, para que la pestaña "Certificaciones" y la
// página pública /verify/[code] sean demostrables desde el primer load (los
// emitidos en runtime se pierden al recargar — limitación del MVP en memoria).
// ————————————————————————————————————————————————

export const certificates: Certificate[] = [
  {
    code: "EQUI-2026-WWB01",
    userId: "u-student",
    courseId: "c-estadistica",
    studentName: "Valentina Mendoza",
    courseTitle: "Fundamentos de Estadística Descriptiva",
    courseDescription:
      "dominando las medidas de tendencia central y dispersión, y aprendiendo a interpretar datos de programas sociales con enfoque de desarrollo y género.",
    teacherName: "Diego Fercho",
    durationMin: 240,
    issuedAt: "2026-08-14T00:00:00.000Z",
  },
];

// ————————————————————————————————————————————————
// Comunidad: posts, likes y respuestas
// ————————————————————————————————————————————————

export const communityPosts: CommunityPost[] = [
  {
    id: "post-1",
    authorId: "u-student",
    body: "¿Alguien más sintió que la calculadora de percentiles le ayudó a entender por fin la mediana? Me hubiera servido esto hace años en el trabajo.",
    createdAt: "2026-08-12T14:20:00.000Z",
  },
  {
    id: "post-2",
    authorId: "u-s2",
    body: "Terminé la sesión de dispersión y variabilidad. La parte de desviación estándar con datos de cobertura territorial estuvo buenísima.",
    createdAt: "2026-08-13T09:05:00.000Z",
  },
  {
    id: "post-3",
    authorId: "u-s3",
    body: "¿Alguna sede ya usó el diagnóstico inicial con su equipo? Quiero saber cómo les fue armando la línea base.",
    createdAt: "2026-08-13T16:40:00.000Z",
  },
];

export const communityLikes: CommunityLike[] = [
  { postId: "post-1", userId: "u-s2", createdAt: "2026-08-12T15:00:00.000Z" },
  { postId: "post-1", userId: "u-s3", createdAt: "2026-08-12T16:10:00.000Z" },
  { postId: "post-2", userId: "u-student", createdAt: "2026-08-13T10:00:00.000Z" },
];

export const communityReplies: CommunityReply[] = [
  {
    id: "reply-1",
    postId: "post-1",
    authorId: "u-teacher",
    body: "¡Qué bueno leer esto! Esa calculadora la armamos pensando justo en eso — el concepto se entiende mejor jugando con los datos que memorizando la fórmula.",
    createdAt: "2026-08-12T18:30:00.000Z",
  },
];

/**
 * Ejemplo real de reto: HTML de autor con 3 preguntas de opción múltiple que
 * se autocalifica en el propio iframe y reporta el resultado al padre por
 * postMessage — el contrato que debe seguir cualquier HTML de reto que
 * escriba el profesor: `parent.postMessage({ type: "equidata-reto-result",
 * score, total }, "*")`.
 */
const CHALLENGE_TENDENCIA_CENTRAL_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; color: #12224F; }
  h2 { font-size: 18px; margin: 0 0 12px; }
  .q { margin-bottom: 16px; padding: 12px; border: 1px solid #DEDEE6; border-radius: 12px; }
  .q p { margin: 0 0 8px; font-weight: 600; }
  label { display: block; margin: 4px 0; cursor: pointer; }
  button { background: #12224F; color: white; border: none; padding: 10px 18px; border-radius: 999px; font-size: 14px; cursor: pointer; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  #result { margin-top: 16px; font-weight: 600; }
</style>
</head>
<body>
  <h2>Reto rápido: medidas de tendencia central</h2>
  <div class="q" data-correct="b">
    <p>1. ¿Cuál medida es más sensible a valores extremos (outliers)?</p>
    <label><input type="radio" name="q1" value="a"> Mediana</label>
    <label><input type="radio" name="q1" value="b"> Media</label>
    <label><input type="radio" name="q1" value="c"> Moda</label>
  </div>
  <div class="q" data-correct="a">
    <p>2. En el conjunto [2, 3, 3, 3, 9], ¿cuál es la moda?</p>
    <label><input type="radio" name="q2" value="a"> 3</label>
    <label><input type="radio" name="q2" value="b"> 9</label>
    <label><input type="radio" name="q2" value="c"> 4</label>
  </div>
  <div class="q" data-correct="c">
    <p>3. ¿Cuál medida se usa mejor con datos categóricos (no numéricos)?</p>
    <label><input type="radio" name="q3" value="a"> Media</label>
    <label><input type="radio" name="q3" value="b"> Mediana</label>
    <label><input type="radio" name="q3" value="c"> Moda</label>
  </div>
  <button id="submit">Ver resultado</button>
  <div id="result"></div>
  <script>
    document.getElementById('submit').addEventListener('click', function () {
      var questions = document.querySelectorAll('.q');
      var score = 0;
      questions.forEach(function (q, i) {
        var name = 'q' + (i + 1);
        var checked = q.querySelector('input[name="' + name + '"]:checked');
        var correct = q.getAttribute('data-correct');
        if (checked && checked.value === correct) score++;
      });
      var total = questions.length;
      document.getElementById('result').textContent = 'Sacaste ' + score + ' de ' + total + '.';
      document.getElementById('submit').disabled = true;
      parent.postMessage({ type: 'equidata-reto-result', score: score, total: total }, '*');
    });
  </script>
</body>
</html>`;

export const challenges: Challenge[] = [
  {
    id: "ch-tendencia-central",
    title: "Medidas de tendencia central",
    description: "Responde 3 preguntas rápidas sobre media, mediana y moda.",
    difficulty: "Básico",
    contentHtml: CHALLENGE_TENDENCIA_CENTRAL_HTML,
    createdAt: "2026-08-05T00:00:00.000Z",
  },
];
