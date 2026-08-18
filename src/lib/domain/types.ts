/**
 * EQUIdata — Modelo de dominio
 *
 * Estos tipos son la columna vertebral de la app y el contrato entre las
 * pantallas y la capa de datos. Hoy los sirve un repositorio en memoria
 * (MockRepository); mañana un SupabaseRepository con la misma firma. Por eso
 * los IDs son strings (uuid-friendly) y las fechas son ISO strings.
 *
 * Fuente: 260813_desing-spec.md
 */

// ————————————————————————————————————————————————
// Identidad
// ————————————————————————————————————————————————

export type Role = "student" | "teacher";

export interface User {
  id: string;
  email: string;
  role: Role;
  /** Nombre visible (saludo, avatar). Para el estudiante se arma del perfil. */
  displayName: string;
  avatarUrl?: string;
  /** ISO. Para "quién está activo" en el panel del profesor. */
  lastSeen?: string;
}

/** Datos capturados una sola vez en el onboarding del estudiante, editables después desde Configuración. */
export interface StudentProfile {
  userId: string;
  nombres: string;
  apellidos: string;
  /** Valor de la lista fija de cargo (ver src/lib/brand/cargo.ts). */
  cargo: string;
  /** Valor de la lista fija de área/programa. */
  area: string;
  /** Opcional — no todos los perfiles existentes lo traen cargado aún. */
  cedula?: string;
  /** Respuestas a los campos de onboarding que agregó el profesor, por `OnboardingFieldDef.id`. */
  customFields?: Record<string, string>;
  /** true cuando ya completó el onboarding. */
  completed: boolean;
  /** Privacidad: si es false, Comunidad muestra un nombre genérico en vez del real. Default true (sin definir = visible). */
  showNameInCommunity?: boolean;
  /** Notificaciones: si es false, se oculta el aviso de mensajes sin leer (sidebar + campana). Default true. */
  notifyUnreadMessages?: boolean;
  /** Notificaciones: si es false, se oculta el recordatorio de racha en el dashboard. Default true. */
  notifyStreakReminder?: boolean;
}

/** Campo de onboarding creado por el profesor (spec: constructor genérico, sin tocar código). */
export interface OnboardingFieldDef {
  id: string;
  label: string;
  type: "text" | "select";
  /** Solo si type === 'select'. */
  options?: string[];
  order: number;
}

// ————————————————————————————————————————————————
// Cursos → Sesiones → Módulos
// ————————————————————————————————————————————————

export interface Course {
  id: string;
  title: string;
  description: string;
  /** Texto de logro que aparece en el certificado. Si falta, se usa `description`. */
  certificateDescription?: string;
  /**
   * Duración del curso para el certificado, en horas, escrita por el
   * profesor al crear/editar el curso (no se calcula sumando módulos: el
   * tiempo real de un curso incluye más que solo el largo de sus videos/HTML).
   * Si falta, se calcula sumando `Module.durationMin` como respaldo.
   */
  certificateDurationHours?: number;
  coverUrl?: string;
  published: boolean;
  /** true: cualquiera se autoinscribe (si el curso está publicado); false: solo el profesor inscribe. */
  enrollmentOpen: boolean;
  teacherName: string;
}

export interface Session {
  id: string;
  courseId: string;
  /** Orden dentro del curso (1-based). */
  order: number;
  title: string;
  /** ISO. Fecha de liberación fijada por el profesor (condición de desbloqueo). */
  unlockDate?: string;
}

export type ModuleType = "video" | "html";

/** Contexto: módulo de curso, o tutorial rápido suelto. */
export type ModuleContext = "course" | "tutorial";

export interface Module {
  id: string;
  /** null cuando es un tutorial rápido (no cuelga de una sesión). */
  sessionId: string | null;
  context: ModuleContext;
  /** Orden dentro de la sesión (1-based). Los tutoriales usan su propio orden. */
  order: number;
  type: ModuleType;
  title: string;
  description: string;
  /** Presente si type === 'video'. URL embebible (p. ej. YouTube). */
  videoUrl?: string;
  /** Presente si type === 'html'. HTML de autor, renderizado aislado. */
  contentHtml?: string;
  /** Duración estimada en minutos (para etiquetas). */
  durationMin?: number;
}

// ————————————————————————————————————————————————
// Evaluaciones: diagnósticos y quizes
// ————————————————————————————————————————————————

export type EvaluationKind =
  | "diagnostic_initial"
  | "quiz"
  | "diagnostic_final"
  /** Mini-quiz de intereses por curso (no de conocimiento) — arroja un Archetype, no una nota. */
  | "interest_onboarding"
  /** Quiz simple de un tutorial suelto (% de aprobación, sin RA). */
  | "tutorial_quiz";

export interface Evaluation {
  id: string;
  /** Undefined en quizzes de tutorial — no pertenecen a un curso. */
  courseId?: string;
  /** Sesión a la que pertenece el quiz (undefined en diagnósticos de curso). */
  sessionId?: string;
  /** Módulo de tutorial al que pertenece — solo cuando kind === 'tutorial_quiz'. */
  tutorialModuleId?: string;
  kind: EvaluationKind;
  title: string;
  /** Nº de intentos configurable por el profesor. Default: quiz 2, inicial 1, final 2. */
  maxAttempts: number;
  /** Espera en horas entre tandas de intentos. Solo diagnóstico final (8). */
  waitHours: number;
  /** % de aprobación (0–100). undefined en diagnóstico inicial (no aprueba/reprueba). */
  passingScore?: number;
  isActive: boolean;
  /** Ubicación: se muestra después de este módulo, si aplica. */
  placementAfterModuleId?: string;
}

/** Resultado de aprendizaje (dimensión temática) de una evaluación. */
export interface LearningOutcome {
  id: string;
  evaluationId: string;
  /** Código corto (RA1, RA2…). */
  code: string;
  name: string;
  /** Nivel esperado (% objetivo, 0–100). */
  expectedLevel: number;
}

export type QuestionType =
  | "single" // opción única
  | "multiple" // opción múltiple
  | "open" // respuesta abierta (no puntúa)
  | "scale" // escala 1–10
  | "ranking"; // ordenar opciones

export interface Question {
  id: string;
  evaluationId: string;
  order: number;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  points: number;
  /**
   * Cada pregunta pertenece a un resultado de aprendizaje — excepto en
   * evaluaciones `interest_onboarding`, donde no hay RA (el mapeo va por
   * `QuestionOption.archetypeId`).
   */
  outcomeId?: string;
  /** Escala: valor esperado y tolerancia (opcionales; si faltan, es autorreporte). */
  correctValue?: number;
  tolerance?: number;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  imageUrl?: string;
  /** single/multiple: marca la(s) correcta(s). */
  isCorrect?: boolean;
  /** ranking: posición correcta (1-based). */
  correctRank?: number;
  /** Solo en preguntas de `interest_onboarding`: a qué arquetipo suma esta opción. */
  archetypeId?: string;
}

/** Arquetipo de intereses de un curso (spec: "Eres un/a {name}"), definido por el profesor. */
export interface Archetype {
  id: string;
  courseId: string;
  name: string;
  description: string;
  order: number;
}

// ————————————————————————————————————————————————
// Inscripción, progreso e intentos
// ————————————————————————————————————————————————

export interface Enrollment {
  userId: string;
  courseId: string;
  /** ISO. */
  enrolledAt: string;
}

export interface ModuleProgress {
  userId: string;
  moduleId: string;
  completed: boolean;
  /** ISO. */
  completedAt?: string;
}

export type AttemptStatus = "in_progress" | "submitted";

export interface Attempt {
  id: string;
  userId: string;
  evaluationId: string;
  /** ISO. */
  startedAt: string;
  /** ISO. */
  submittedAt?: string;
  /** Nota global 0–100 (undefined mientras esté en progreso). */
  score?: number;
  status: AttemptStatus;
}

export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  /** single/multiple. */
  selectedOptionIds?: string[];
  /** open. */
  openText?: string;
  /** scale. */
  scaleValue?: number;
  /** ranking: ids de opción en el orden elegido. */
  rankingOrder?: string[];
  /** Puntos obtenidos (tras calificar). */
  pointsAwarded?: number;
  isCorrect?: boolean;
}

/** Desempeño por resultado de aprendizaje en un intento (RA feedback + pre/post). */
export interface OutcomeScore {
  attemptId: string;
  outcomeId: string;
  /** % esperado (del outcome). */
  expected: number;
  /** % logrado por la persona en las preguntas de ese RA. */
  achieved: number;
}

// ————————————————————————————————————————————————
// Comunicación
// ————————————————————————————————————————————————

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  /** Opcional: mensaje asociado a un curso. */
  courseId?: string;
  body: string;
  /** ISO. */
  createdAt: string;
  read: boolean;
}

// ————————————————————————————————————————————————
// Comunidad: posts públicos, likes y respuestas
// ————————————————————————————————————————————————

export interface CommunityPost {
  id: string;
  authorId: string;
  body: string;
  category?: "preguntas" | "hallazgos" | "retos" | "celebraciones";
  /** ISO. */
  createdAt: string;
}

export interface CommunityLike {
  postId: string;
  userId: string;
  /** ISO. */
  createdAt: string;
}

export interface CommunityReply {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  /** ISO. */
  createdAt: string;
}

// ————————————————————————————————————————————————
// Certificados (spec §5.6): entidad emitida con código de verificación
// ————————————————————————————————————————————————

/**
 * Certificado emitido para un usuario en un curso. Guarda **snapshots** de los
 * datos al momento de emitir (nombre, curso, descripción, profesor), para que
 * el certificado no cambie si el curso se edita después. El `code` es el id
 * público que se verifica en /verify/[code].
 */
export interface Certificate {
  code: string;
  userId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
  courseDescription: string;
  teacherName: string;
  /** Duración total del curso en minutos (suma de módulos), snapshot al emitir. */
  durationMin: number;
  /** ISO. */
  issuedAt: string;
}

// ————————————————————————————————————————————————
// Retos (real desde esta ronda — antes fachada): HTML de autor que el propio
// contenido califica y reporta por postMessage (ver ChallengeViewer).
// ————————————————————————————————————————————————

export type ChallengeDifficulty = "Básico" | "Intermedio" | "Avanzado";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  /** HTML de autor con el ejercicio interactivo; al terminar hace postMessage con el resultado. */
  contentHtml: string;
  /** ISO. */
  createdAt: string;
}

/** Un intento resuelto — se guarda uno por cada vez que el HTML reporta un resultado (permite reintentar). */
export interface ChallengeAttempt {
  id: string;
  userId: string;
  challengeId: string;
  score: number;
  total: number;
  /** ISO. */
  completedAt: string;
}

// ————————————————————————————————————————————————
// Gamificación (real): racha (derivada, no se guarda) + ánimo diario
// ————————————————————————————————————————————————

export type MoodValue =
  | "feliz"
  | "enojada"
  | "triste"
  | "entusiasmada"
  | "indiferente"
  | "sorprendida"
  | "aburrida"
  | "abrumada"
  | "pensativa"
  | "enternecida"
  | "divertida"
  | "en-desacuerdo"
  | "preocupada"
  | "asustada"
  | "frustrada"
  | "cansada";

/** Check-in de ánimo diario del estudiante (una entrada por día; se reemplaza si vuelve a elegir el mismo día). */
export interface MoodEntry {
  userId: string;
  /** Día ISO, formato YYYY-MM-DD. */
  dayKey: string;
  mood: MoodValue;
  /** Por qué se siente así, si quiso contarlo. */
  comment?: string;
  /** ISO. */
  createdAt: string;
}

// ————————————————————————————————————————————————
// Derivados (no se persisten; se calculan con src/lib/logic)
// ————————————————————————————————————————————————

/** Estado de desbloqueo de una sesión, con su motivo si está bloqueada. */
export interface SessionUnlockState {
  unlocked: boolean;
  reason?: "date" | "prev_quiz" | "diagnostic_pending";
  /** Texto listo para mostrar en el candado. */
  reasonLabel?: string;
}

/** Evento de calendario derivado de fechas existentes (solo lectura). */
export interface CalendarEvent {
  id: string;
  date: string; // ISO
  title: string;
  kind: "unlock" | "evaluation" | "deadline" | "event";
  courseId?: string;
}
