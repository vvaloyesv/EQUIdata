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
  // Identidad ---------------------------------------------------------------
  getCurrentUser(): Promise<User | null>;
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
  listModules(sessionId: string): Promise<Module[]>;
  createModule(module: Module): Promise<Module>;
  updateModule(module: Module): Promise<Module>;
  listTutorials(): Promise<Module[]>;
  getModule(moduleId: string): Promise<Module | null>;

  // Inscripción / progreso --------------------------------------------------
  listEnrollments(userId: string): Promise<Enrollment[]>;
  listEnrollmentsByCourse(courseId: string): Promise<Enrollment[]>;
  createEnrollment(enrollment: Enrollment): Promise<Enrollment>;
  removeEnrollment(userId: string, courseId: string): Promise<void>;
  listModuleProgress(userId: string): Promise<ModuleProgress[]>;
  setModuleProgress(progress: ModuleProgress): Promise<ModuleProgress>;

  // Evaluaciones ------------------------------------------------------------
  listEvaluations(courseId: string): Promise<Evaluation[]>;
  getEvaluation(evaluationId: string): Promise<Evaluation | null>;
  createEvaluation(evaluation: Evaluation): Promise<Evaluation>;
  /** Quiz de un tutorial suelto (kind === 'tutorial_quiz'), si el profesor le puso uno. */
  getTutorialQuiz(tutorialModuleId: string): Promise<Evaluation | undefined>;
  updateEvaluation(evaluation: Evaluation): Promise<Evaluation>;
  listOutcomes(evaluationId: string): Promise<LearningOutcome[]>;
  createOutcome(outcome: LearningOutcome): Promise<LearningOutcome>;
  listQuestions(evaluationId: string): Promise<Question[]>;
  createQuestion(question: Question): Promise<Question>;
  listOptions(questionId: string): Promise<QuestionOption[]>;
  createOption(option: QuestionOption): Promise<QuestionOption>;

  // Arquetipos (onboarding de intereses por curso) ---------------------------
  listArchetypes(courseId: string): Promise<Archetype[]>;
  createArchetype(archetype: Archetype): Promise<Archetype>;
  removeArchetype(id: string): Promise<void>;

  // Intentos / respuestas ---------------------------------------------------
  listAttempts(userId: string, evaluationId: string): Promise<Attempt[]>;
  listAttemptsByEvaluation(evaluationId: string): Promise<Attempt[]>;
  createAttempt(attempt: Attempt): Promise<Attempt>;
  saveAnswers(answers: Answer[]): Promise<void>;
  listAnswers(attemptId: string): Promise<Answer[]>;
  saveOutcomeScores(scores: OutcomeScore[]): Promise<void>;
  listOutcomeScores(attemptId: string): Promise<OutcomeScore[]>;
  /** Intentos extra que el profesor otorga manualmente (spec §5.11 "reabrir intentos"). */
  getBonusAttempts(userId: string, evaluationId: string): Promise<number>;
  grantBonusAttempt(userId: string, evaluationId: string): Promise<void>;

  // Comunicación ------------------------------------------------------------
  listMessages(userId: string): Promise<Message[]>;
  sendMessage(message: Message): Promise<Message>;
  markConversationRead(userId: string, otherUserId: string): Promise<void>;

  // Comunidad (posts públicos, likes, respuestas) ----------------------------
  listCommunityPosts(): Promise<CommunityPost[]>;
  createCommunityPost(post: CommunityPost): Promise<CommunityPost>;
  listCommunityLikes(postId: string): Promise<CommunityLike[]>;
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
}
