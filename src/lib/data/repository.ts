/**
 * Contrato de acceso a datos.
 *
 * Las pantallas SIEMPRE hablan con esta interfaz, nunca con los datos mock
 * directamente. Hoy la implementa MockRepository (en memoria); mañana un
 * SupabaseRepository con la misma firma. Todas las funciones son async para
 * que el cambio de fuente no altere las llamadas.
 */

import type {
  Answer,
  Archetype,
  Attempt,
  CalendarEvent,
  Certificate,
  Challenge,
  ChallengeAttempt,
  CommunityPost,
  CommunityPostWithStats,
  CommunityReply,
  Course,
  CourseStructure,
  Enrollment,
  Evaluation,
  EvaluationDetail,
  LearningOutcome,
  Message,
  Module,
  ModuleProgress,
  MoodEntry,
  OnboardingFieldDef,
  OutcomeScore,
  Question,
  QuestionOption,
  Session,
  StudentProfile,
  User,
} from "@/lib/domain/types";

export interface Repository {
  // Identidad (el usuario de la sesión lo resuelve AuthContext) -------------
  getUserById(id: string): Promise<User | null>;
  listUsersByRole(role: User["role"]): Promise<User[]>;
  /** Al completar el onboarding, sincroniza el nombre real (nombres + apellidos) — sin esto, User.displayName se queda pegado al valor con el que se creó la cuenta. */
  updateDisplayName(userId: string, displayName: string): Promise<void>;
  /** Foto de perfil — la URL ya apunta a un archivo subido y comprimido (Supabase Storage en modo real). */
  updateAvatarUrl(userId: string, avatarUrl: string): Promise<void>;
  getStudentProfile(userId: string): Promise<StudentProfile | null>;
  saveStudentProfile(profile: StudentProfile): Promise<StudentProfile>;
  /** Todos los perfiles de estudiante (panel del profesor: lista de estudiantes). */
  listStudentProfiles(): Promise<StudentProfile[]>;

  // Cursos / sesiones / módulos --------------------------------------------
  listCourses(): Promise<Course[]>;
  getCourse(courseId: string): Promise<Course | null>;
  createCourse(course: Course): Promise<Course>;
  updateCourse(course: Course): Promise<Course>;
  listSessions(courseId: string): Promise<Session[]>;
  createSession(session: Session): Promise<Session>;
  updateSession(session: Session): Promise<Session>;
  /** Módulos de una sesión, en orden, SIN `contentHtml` (ver `getModuleContent`). */
  listModules(sessionId: string): Promise<Module[]>;
  createModule(module: Module): Promise<Module>;
  updateModule(module: Module): Promise<Module>;
  /** Tutoriales sueltos, en orden, SIN `contentHtml` (ver `getModuleContent`). */
  listTutorials(): Promise<Module[]>;

  // Inscripción / progreso --------------------------------------------------
  listEnrollments(userId: string): Promise<Enrollment[]>;
  listEnrollmentsByCourse(courseId: string): Promise<Enrollment[]>;
  createEnrollment(enrollment: Enrollment): Promise<Enrollment>;
  removeEnrollment(userId: string, courseId: string): Promise<void>;
  listModuleProgress(userId: string): Promise<ModuleProgress[]>;
  setModuleProgress(progress: ModuleProgress): Promise<ModuleProgress>;

  // Evaluaciones ------------------------------------------------------------
  listEvaluations(courseId: string): Promise<Evaluation[]>;
  createEvaluation(evaluation: Evaluation): Promise<Evaluation>;
  /** Quiz de un tutorial suelto (kind === 'tutorial_quiz'), si el profesor le puso uno. */
  getTutorialQuiz(tutorialModuleId: string): Promise<Evaluation | undefined>;
  updateEvaluation(evaluation: Evaluation): Promise<Evaluation>;
  listOutcomes(evaluationId: string): Promise<LearningOutcome[]>;
  createOutcome(outcome: LearningOutcome): Promise<LearningOutcome>;
  createQuestion(question: Question): Promise<Question>;
  createOption(option: QuestionOption): Promise<QuestionOption>;

  // Arquetipos (onboarding de intereses por curso) ---------------------------
  listArchetypes(courseId: string): Promise<Archetype[]>;
  createArchetype(archetype: Archetype): Promise<Archetype>;
  removeArchetype(id: string): Promise<void>;

  // Intentos / respuestas ---------------------------------------------------
  listAttempts(userId: string, evaluationId: string): Promise<Attempt[]>;
  listAttemptsByEvaluation(evaluationId: string): Promise<Attempt[]>;
  listAnswers(attemptId: string): Promise<Answer[]>;
  listOutcomeScores(attemptId: string): Promise<OutcomeScore[]>;
  /** Intentos extra que el profesor otorga manualmente (spec §5.11 "reabrir intentos"). */
  getBonusAttempts(userId: string, evaluationId: string): Promise<number>;
  grantBonusAttempt(userId: string, evaluationId: string): Promise<void>;

  // Comunicación ------------------------------------------------------------
  listMessages(userId: string): Promise<Message[]>;
  sendMessage(message: Message): Promise<Message>;
  markConversationRead(userId: string, otherUserId: string): Promise<void>;

  // Comunidad (posts públicos, likes, respuestas; el feed va en listCommunityFeed)
  createCommunityPost(post: CommunityPost): Promise<CommunityPost>;
  /** Alterna el like de userId sobre postId; devuelve el estado resultante. */
  toggleCommunityLike(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; count: number }>;
  listCommunityReplies(postId: string): Promise<CommunityReply[]>;
  createCommunityReply(reply: CommunityReply): Promise<CommunityReply>;

  // Configuración (listas fijas del onboarding, spec §5.1) -------------------
  listAreaOptions(): Promise<string[]>;
  addAreaOption(value: string): Promise<void>;
  removeAreaOption(value: string): Promise<void>;

  // Onboarding: campos personalizados (constructor genérico del profesor) ---
  listOnboardingFields(): Promise<OnboardingFieldDef[]>;
  createOnboardingField(field: OnboardingFieldDef): Promise<OnboardingFieldDef>;
  removeOnboardingField(id: string): Promise<void>;

  // Gamificación (ánimo semanal; la racha se deriva de ModuleProgress) ------
  getMoodEntry(userId: string, dayKey: string): Promise<MoodEntry | null>;
  setMoodEntry(entry: MoodEntry): Promise<MoodEntry>;

  // Certificados (spec §5.6) ------------------------------------------------
  listCertificates(userId: string): Promise<Certificate[]>;
  getCertificate(userId: string, courseId: string): Promise<Certificate | null>;
  getCertificateByCode(code: string): Promise<Certificate | null>;
  /** Idempotente: si ya existe uno para userId+courseId, devuelve el existente. */
  issueCertificate(certificate: Certificate): Promise<Certificate>;

  // Retos (HTML de autor que se autocalifica, ver ChallengeViewer) ----------
  listChallenges(): Promise<Challenge[]>;
  getChallenge(challengeId: string): Promise<Challenge | null>;
  createChallenge(challenge: Challenge): Promise<Challenge>;
  /** Todos los intentos de este usuario, en todos los retos. */
  listChallengeAttempts(userId: string): Promise<ChallengeAttempt[]>;
  createChallengeAttempt(attempt: ChallengeAttempt): Promise<ChallengeAttempt>;

  // Derivados ---------------------------------------------------------------
  listCalendarEvents(userId: string): Promise<CalendarEvent[]>;

  // Lecturas y escrituras en bloque (M10 · F4) -------------------------------
  // Regla: ningún view-model consulta dentro de un bucle. Si una pantalla
  // necesita "lo mismo para cada sesión/estudiante/pregunta", se pide todo
  // junto con uno de estos métodos (una consulta, sin importar cuántos haya).

  /** Estructura de varios cursos en una consulta (módulos sin HTML). Los ids que no existen se omiten. */
  getCourseStructures(courseIds: string[]): Promise<CourseStructure[]>;
  /** Lo único que las listas no traen: el HTML (y la URL de video) de un módulo. */
  getModuleContent(moduleId: string): Promise<Pick<Module, "contentHtml" | "videoUrl"> | null>;
  /** Evaluación con preguntas, opciones y resultados de aprendizaje, en una consulta. */
  getEvaluationDetail(evaluationId: string): Promise<EvaluationDetail | null>;
  /** Evaluaciones `tutorial_quiz` de todos los tutoriales. */
  listTutorialQuizzes(): Promise<Evaluation[]>;
  listUsersByIds(ids: string[]): Promise<User[]>;
  /** Todas las inscripciones (panel del profesor). */
  listAllEnrollments(): Promise<Enrollment[]>;
  listModuleProgressForUsers(userIds: string[]): Promise<ModuleProgress[]>;
  /** Todos los intentos del usuario, en todas sus evaluaciones. */
  listAttemptsByUser(userId: string): Promise<Attempt[]>;
  listAttemptsByEvaluations(evaluationIds: string[]): Promise<Attempt[]>;
  /** Intentos extra del usuario: evaluationId → cantidad. */
  listBonusAttemptsByUser(userId: string): Promise<Record<string, number>>;
  /** Intentos extra de una evaluación: userId → cantidad. */
  listBonusAttemptsByEvaluation(evaluationId: string): Promise<Record<string, number>>;
  listAnswersByAttempts(attemptIds: string[]): Promise<Answer[]>;
  listOutcomeScoresByAttempts(attemptIds: string[]): Promise<OutcomeScore[]>;
  countUnreadMessages(userId: string): Promise<number>;
  /** Feed de Comunidad con autor, likes y conteo de respuestas, en una consulta. */
  listCommunityFeed(): Promise<CommunityPostWithStats[]>;
  /**
   * Ids de quienes pidieron ocultar su nombre en Comunidad
   * (`showNameInCommunity === false`). Visible para cualquier autenticado:
   * es lo único del perfil que otra persona necesita para respetar la
   * preferencia (0008_community_privacy.sql).
   */
  listHiddenCommunityAuthorIds(): Promise<string[]>;
  /** Intento enviado, completo o nada: intento + respuestas + resultados por RA. */
  submitAttempt(attempt: Attempt, answers: Answer[], outcomeScores: OutcomeScore[]): Promise<void>;
  /** Varios mensajes en una escritura (envío a todo un curso). */
  sendMessages(messages: Message[]): Promise<void>;
}
