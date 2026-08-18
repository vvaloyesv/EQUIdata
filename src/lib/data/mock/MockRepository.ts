/**
 * Implementación en memoria del contrato Repository.
 *
 * Guarda copias mutables de la semilla para simular escrituras dentro de una
 * sesión de navegador. No persiste entre recargas (es un MVP local). Cuando
 * llegue Supabase, se crea SupabaseRepository con esta misma firma y se cambia
 * el selector en ../index.ts — las pantallas no se tocan.
 *
 * Dos reglas de defensa que sí valen la pena en un mock (y que se traducen
 * directo a constraints/RLS reales cuando llegue Supabase):
 *  - Toda lectura devuelve una copia (`clone`), nunca la referencia interna —
 *    así una pantalla no puede corromper el estado mutando el objeto devuelto
 *    sin pasar por un método `update*`/`create*`.
 *  - Toda escritura valida su forma con Zod y las reglas de integridad
 *    mínimas (unicidad de id, referencias existentes) antes de aceptarse.
 */

import type { Repository } from "@/lib/data/repository";
import type {
  Answer,
  Archetype,
  Attempt,
  CalendarEvent,
  Certificate,
  Challenge,
  ChallengeAttempt,
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
import * as seed from "./seed";
import { AREA_OPTIONS } from "@/lib/brand/lists";
import {
  AnswerSchema,
  ArchetypeSchema,
  AttemptSchema,
  CertificateSchema,
  ChallengeAttemptSchema,
  ChallengeSchema,
  CommunityPostSchema,
  CommunityReplySchema,
  CourseSchema,
  EnrollmentSchema,
  EvaluationSchema,
  LearningOutcomeSchema,
  MessageSchema,
  ModuleProgressSchema,
  ModuleSchema,
  MoodEntrySchema,
  OnboardingFieldDefSchema,
  OutcomeScoreSchema,
  QuestionOptionSchema,
  QuestionSchema,
  SessionSchema,
  StudentProfileSchema,
} from "@/lib/domain/schemas";

function clone<T>(x: T): T {
  // JSON.stringify(undefined) devuelve el valor undefined (no un string), y
  // JSON.parse(undefined) explota — pasa con getters que devuelven
  // `T | undefined` (p. ej. getTutorialQuiz) cuando no hay nada que devolver.
  if (x === undefined) return x;
  return JSON.parse(JSON.stringify(x)) as T;
}

/** Error de integridad: id duplicado, referencia inexistente o regla de negocio violada. */
export class RepositoryError extends Error {}

function fail(message: string): never {
  throw new RepositoryError(message);
}

export class MockRepository implements Repository {
  private users = clone(seed.users);
  private profiles = clone(seed.studentProfiles);
  private courses = clone(seed.courses);
  private sessions = clone(seed.sessions);
  private modules = clone(seed.modules);
  private enrollments = clone(seed.enrollments);
  private progress = clone(seed.moduleProgress);
  private evaluations = clone(seed.evaluations);
  private outcomes = clone(seed.outcomes);
  private questions = clone(seed.questions);
  private options = clone(seed.questionOptions);
  private attempts = clone(seed.attempts);
  private answers = clone(seed.answers);
  private outcomeScores = clone(seed.outcomeScores);
  private messages = clone(seed.messages);
  /** Intentos extra otorgados manualmente por el profesor: "userId:evaluationId" -> cantidad. */
  private bonusAttempts = new Map<string, number>();
  private areaOptions: string[] = [...AREA_OPTIONS];
  private moodEntries: MoodEntry[] = [];
  private certificates = clone(seed.certificates);
  private communityPosts = clone(seed.communityPosts);
  private communityLikes = clone(seed.communityLikes);
  private communityReplies = clone(seed.communityReplies);
  private onboardingFields: OnboardingFieldDef[] = [];
  private archetypes: Archetype[] = [];
  private challenges = clone(seed.challenges);
  private challengeAttempts: ChallengeAttempt[] = [];

  /** Usuario "logueado". null = sin sesión (arranca así; el login lo fija). */
  private currentUserId: string | null = null;

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
  }

  // Identidad ---------------------------------------------------------------
  async getCurrentUser() {
    return clone(this.users.find((u) => u.id === this.currentUserId) ?? null);
  }
  async getUserById(id: string) {
    return clone(this.users.find((u) => u.id === id) ?? null);
  }
  async listUsersByRole(role: User["role"]) {
    return clone(this.users.filter((u) => u.role === role));
  }
  async updateDisplayName(userId: string, displayName: string) {
    const i = this.users.findIndex((u) => u.id === userId);
    if (i < 0) fail(`Usuario no encontrado: ${userId}`);
    this.users[i] = { ...this.users[i], displayName };
  }
  async updateAvatarUrl(userId: string, avatarUrl: string) {
    const i = this.users.findIndex((u) => u.id === userId);
    if (i < 0) fail(`Usuario no encontrado: ${userId}`);
    this.users[i] = { ...this.users[i], avatarUrl };
  }
  async getStudentProfile(userId: string) {
    return clone(this.profiles.find((p) => p.userId === userId) ?? null);
  }
  async saveStudentProfile(profile: StudentProfile) {
    const parsed = StudentProfileSchema.parse(profile);
    if (!this.users.some((u) => u.id === parsed.userId)) {
      fail(`Usuario no encontrado: ${parsed.userId}`);
    }
    const i = this.profiles.findIndex((p) => p.userId === parsed.userId);
    if (i >= 0) this.profiles[i] = parsed;
    else this.profiles.push(parsed);
    return clone(parsed);
  }
  async listStudentProfiles() {
    return clone(this.profiles);
  }

  // Cursos / sesiones / módulos --------------------------------------------
  async listCourses() {
    return clone(this.courses);
  }
  async getCourse(courseId: string) {
    return clone(this.courses.find((c) => c.id === courseId) ?? null);
  }
  async createCourse(course: Course) {
    const parsed = CourseSchema.parse(course);
    if (this.courses.some((c) => c.id === parsed.id)) {
      fail(`Ya existe un curso con id: ${parsed.id}`);
    }
    this.courses.push(parsed);
    return clone(parsed);
  }
  async updateCourse(course: Course) {
    const parsed = CourseSchema.parse(course);
    const i = this.courses.findIndex((c) => c.id === parsed.id);
    if (i < 0) fail(`Curso no encontrado: ${parsed.id}`);
    this.courses[i] = parsed;
    return clone(parsed);
  }
  async listSessions(courseId: string) {
    return clone(
      this.sessions
        .filter((s) => s.courseId === courseId)
        .sort((a, b) => a.order - b.order),
    );
  }
  async createSession(session: Session) {
    const parsed = SessionSchema.parse(session);
    if (!this.courses.some((c) => c.id === parsed.courseId)) {
      fail(`Curso no encontrado: ${parsed.courseId}`);
    }
    if (this.sessions.some((s) => s.id === parsed.id)) {
      fail(`Ya existe una sesión con id: ${parsed.id}`);
    }
    this.sessions.push(parsed);
    return clone(parsed);
  }
  async updateSession(session: Session) {
    const parsed = SessionSchema.parse(session);
    const i = this.sessions.findIndex((s) => s.id === parsed.id);
    if (i < 0) fail(`Sesión no encontrada: ${parsed.id}`);
    this.sessions[i] = parsed;
    return clone(parsed);
  }
  async listModules(sessionId: string) {
    return clone(
      this.modules
        .filter((m) => m.sessionId === sessionId)
        .sort((a, b) => a.order - b.order),
    );
  }
  async createModule(module: Module) {
    const parsed = ModuleSchema.parse(module);
    if (parsed.sessionId && !this.sessions.some((s) => s.id === parsed.sessionId)) {
      fail(`Sesión no encontrada: ${parsed.sessionId}`);
    }
    if (this.modules.some((m) => m.id === parsed.id)) {
      fail(`Ya existe un módulo con id: ${parsed.id}`);
    }
    this.modules.push(parsed);
    return clone(parsed);
  }
  async updateModule(module: Module) {
    const parsed = ModuleSchema.parse(module);
    const i = this.modules.findIndex((m) => m.id === parsed.id);
    if (i < 0) fail(`Módulo no encontrado: ${parsed.id}`);
    this.modules[i] = parsed;
    return clone(parsed);
  }
  async listTutorials() {
    return clone(
      this.modules
        .filter((m) => m.context === "tutorial")
        .sort((a, b) => a.order - b.order),
    );
  }
  async getModule(moduleId: string) {
    return clone(this.modules.find((m) => m.id === moduleId) ?? null);
  }

  // Inscripción / progreso --------------------------------------------------
  async listEnrollments(userId: string) {
    return clone(this.enrollments.filter((e) => e.userId === userId));
  }
  async listEnrollmentsByCourse(courseId: string) {
    return clone(this.enrollments.filter((e) => e.courseId === courseId));
  }
  async createEnrollment(enrollment: Enrollment) {
    const parsed = EnrollmentSchema.parse(enrollment);
    if (!this.users.some((u) => u.id === parsed.userId && u.role === "student")) {
      fail(`Estudiante no encontrado: ${parsed.userId}`);
    }
    if (!this.courses.some((c) => c.id === parsed.courseId)) {
      fail(`Curso no encontrado: ${parsed.courseId}`);
    }
    if (
      this.enrollments.some(
        (e) => e.userId === parsed.userId && e.courseId === parsed.courseId,
      )
    ) {
      fail(`${parsed.userId} ya está inscrito en ${parsed.courseId}`);
    }
    this.enrollments.push(parsed);
    return clone(parsed);
  }
  async removeEnrollment(userId: string, courseId: string) {
    this.enrollments = this.enrollments.filter(
      (e) => !(e.userId === userId && e.courseId === courseId),
    );
  }
  async listModuleProgress(userId: string) {
    return clone(this.progress.filter((p) => p.userId === userId));
  }
  async setModuleProgress(progress: ModuleProgress) {
    const parsed = ModuleProgressSchema.parse(progress);
    if (!this.users.some((u) => u.id === parsed.userId)) {
      fail(`Usuario no encontrado: ${parsed.userId}`);
    }
    if (!this.modules.some((m) => m.id === parsed.moduleId)) {
      fail(`Módulo no encontrado: ${parsed.moduleId}`);
    }
    const i = this.progress.findIndex(
      (p) => p.userId === parsed.userId && p.moduleId === parsed.moduleId,
    );
    if (i >= 0) this.progress[i] = parsed;
    else this.progress.push(parsed);
    return clone(parsed);
  }

  // Evaluaciones ------------------------------------------------------------
  async listEvaluations(courseId: string) {
    return clone(this.evaluations.filter((e) => e.courseId === courseId));
  }
  async getEvaluation(evaluationId: string) {
    return clone(this.evaluations.find((e) => e.id === evaluationId) ?? null);
  }
  async createEvaluation(evaluation: Evaluation) {
    const parsed = EvaluationSchema.parse(evaluation);
    if (parsed.courseId && !this.courses.some((c) => c.id === parsed.courseId)) {
      fail(`Curso no encontrado: ${parsed.courseId}`);
    }
    if (this.evaluations.some((e) => e.id === parsed.id)) {
      fail(`Ya existe una evaluación con id: ${parsed.id}`);
    }
    this.evaluations.push(parsed);
    return clone(parsed);
  }
  async getTutorialQuiz(tutorialModuleId: string) {
    return clone(
      this.evaluations.find(
        (e) => e.kind === "tutorial_quiz" && e.tutorialModuleId === tutorialModuleId,
      ),
    );
  }
  async updateEvaluation(evaluation: Evaluation) {
    const parsed = EvaluationSchema.parse(evaluation);
    const i = this.evaluations.findIndex((e) => e.id === parsed.id);
    if (i < 0) fail(`Evaluación no encontrada: ${parsed.id}`);
    this.evaluations[i] = parsed;
    return clone(parsed);
  }
  async listOutcomes(evaluationId: string) {
    return clone(this.outcomes.filter((o) => o.evaluationId === evaluationId));
  }
  async createOutcome(outcome: LearningOutcome) {
    const parsed = LearningOutcomeSchema.parse(outcome);
    if (!this.evaluations.some((e) => e.id === parsed.evaluationId)) {
      fail(`Evaluación no encontrada: ${parsed.evaluationId}`);
    }
    this.outcomes.push(parsed);
    return clone(parsed);
  }
  async listQuestions(evaluationId: string) {
    return clone(
      this.questions
        .filter((q) => q.evaluationId === evaluationId)
        .sort((a, b) => a.order - b.order),
    );
  }
  async createQuestion(question: Question) {
    const parsed = QuestionSchema.parse(question);
    if (!this.evaluations.some((e) => e.id === parsed.evaluationId)) {
      fail(`Evaluación no encontrada: ${parsed.evaluationId}`);
    }
    if (this.questions.some((q) => q.id === parsed.id)) {
      fail(`Ya existe una pregunta con id: ${parsed.id}`);
    }
    this.questions.push(parsed);
    return clone(parsed);
  }
  async listOptions(questionId: string) {
    return clone(this.options.filter((o) => o.questionId === questionId));
  }
  async createOption(option: QuestionOption) {
    const parsed = QuestionOptionSchema.parse(option);
    if (!this.questions.some((q) => q.id === parsed.questionId)) {
      fail(`Pregunta no encontrada: ${parsed.questionId}`);
    }
    if (this.options.some((o) => o.id === parsed.id)) {
      fail(`Ya existe una opción con id: ${parsed.id}`);
    }
    this.options.push(parsed);
    return clone(parsed);
  }

  // Arquetipos --------------------------------------------------------------
  async listArchetypes(courseId: string) {
    return clone(
      this.archetypes
        .filter((a) => a.courseId === courseId)
        .sort((a, b) => a.order - b.order),
    );
  }
  async createArchetype(archetype: Archetype) {
    const parsed = ArchetypeSchema.parse(archetype);
    if (!this.courses.some((c) => c.id === parsed.courseId)) {
      fail(`Curso no encontrado: ${parsed.courseId}`);
    }
    if (this.archetypes.some((a) => a.id === parsed.id)) {
      fail(`Ya existe un arquetipo con id: ${parsed.id}`);
    }
    this.archetypes.push(parsed);
    return clone(parsed);
  }
  async removeArchetype(id: string) {
    this.archetypes = this.archetypes.filter((a) => a.id !== id);
  }

  // Intentos / respuestas ---------------------------------------------------
  async listAttempts(userId: string, evaluationId: string) {
    return clone(
      this.attempts.filter(
        (a) => a.userId === userId && a.evaluationId === evaluationId,
      ),
    );
  }
  async listAttemptsByEvaluation(evaluationId: string) {
    return clone(this.attempts.filter((a) => a.evaluationId === evaluationId));
  }
  async createAttempt(attempt: Attempt) {
    const parsed = AttemptSchema.parse(attempt);
    if (!this.users.some((u) => u.id === parsed.userId)) {
      fail(`Usuario no encontrado: ${parsed.userId}`);
    }
    if (!this.evaluations.some((e) => e.id === parsed.evaluationId)) {
      fail(`Evaluación no encontrada: ${parsed.evaluationId}`);
    }
    if (this.attempts.some((a) => a.id === parsed.id)) {
      fail(`Ya existe un intento con id: ${parsed.id}`);
    }
    this.attempts.push(parsed);
    return clone(parsed);
  }
  async saveAnswers(answers: Answer[]) {
    const parsed = answers.map((a) => AnswerSchema.parse(a));
    for (const a of parsed) {
      if (!this.attempts.some((att) => att.id === a.attemptId)) {
        fail(`Intento no encontrado: ${a.attemptId}`);
      }
    }
    this.answers.push(...parsed);
  }
  async listAnswers(attemptId: string) {
    return clone(this.answers.filter((a) => a.attemptId === attemptId));
  }
  async saveOutcomeScores(scores: OutcomeScore[]) {
    const parsed = scores.map((s) => OutcomeScoreSchema.parse(s));
    this.outcomeScores.push(...parsed);
  }
  async listOutcomeScores(attemptId: string) {
    return clone(this.outcomeScores.filter((s) => s.attemptId === attemptId));
  }
  async getBonusAttempts(userId: string, evaluationId: string) {
    return this.bonusAttempts.get(`${userId}:${evaluationId}`) ?? 0;
  }
  async grantBonusAttempt(userId: string, evaluationId: string) {
    const key = `${userId}:${evaluationId}`;
    this.bonusAttempts.set(key, (this.bonusAttempts.get(key) ?? 0) + 1);
  }

  // Comunicación ------------------------------------------------------------
  async listMessages(userId: string) {
    return clone(
      this.messages
        .filter((m) => m.toUserId === userId || m.fromUserId === userId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }
  async sendMessage(message: Message) {
    const parsed = MessageSchema.parse(message);
    if (!this.users.some((u) => u.id === parsed.fromUserId)) {
      fail(`Remitente no encontrado: ${parsed.fromUserId}`);
    }
    if (!this.users.some((u) => u.id === parsed.toUserId)) {
      fail(`Destinatario no encontrado: ${parsed.toUserId}`);
    }
    if (this.messages.some((m) => m.id === parsed.id)) {
      fail(`Ya existe un mensaje con id: ${parsed.id}`);
    }
    this.messages.push(parsed);
    return clone(parsed);
  }
  async markConversationRead(userId: string, otherUserId: string) {
    this.messages = this.messages.map((m) =>
      m.toUserId === userId && m.fromUserId === otherUserId
        ? { ...m, read: true }
        : m,
    );
  }

  // Comunidad -------------------------------------------------------------
  async listCommunityPosts() {
    return clone(
      [...this.communityPosts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  async createCommunityPost(post: CommunityPost) {
    const parsed = CommunityPostSchema.parse(post);
    if (!this.users.some((u) => u.id === parsed.authorId)) {
      fail(`Autor no encontrado: ${parsed.authorId}`);
    }
    if (this.communityPosts.some((p) => p.id === parsed.id)) {
      fail(`Ya existe una publicación con id: ${parsed.id}`);
    }
    this.communityPosts.push(parsed);
    return clone(parsed);
  }
  async listCommunityLikes(postId: string) {
    return clone(this.communityLikes.filter((l) => l.postId === postId));
  }
  async toggleCommunityLike(postId: string, userId: string) {
    if (!this.communityPosts.some((p) => p.id === postId)) {
      fail(`Publicación no encontrada: ${postId}`);
    }
    const i = this.communityLikes.findIndex(
      (l) => l.postId === postId && l.userId === userId,
    );
    if (i >= 0) this.communityLikes.splice(i, 1);
    else {
      this.communityLikes.push({ postId, userId, createdAt: new Date().toISOString() });
    }
    const count = this.communityLikes.filter((l) => l.postId === postId).length;
    return { liked: i < 0, count };
  }
  async listCommunityReplies(postId: string) {
    return clone(
      this.communityReplies
        .filter((r) => r.postId === postId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }
  async createCommunityReply(reply: CommunityReply) {
    const parsed = CommunityReplySchema.parse(reply);
    if (!this.communityPosts.some((p) => p.id === parsed.postId)) {
      fail(`Publicación no encontrada: ${parsed.postId}`);
    }
    if (!this.users.some((u) => u.id === parsed.authorId)) {
      fail(`Autor no encontrado: ${parsed.authorId}`);
    }
    if (this.communityReplies.some((r) => r.id === parsed.id)) {
      fail(`Ya existe una respuesta con id: ${parsed.id}`);
    }
    this.communityReplies.push(parsed);
    return clone(parsed);
  }

  // Configuración -------------------------------------------------------
  async listAreaOptions() {
    return [...this.areaOptions];
  }
  async addAreaOption(value: string) {
    const trimmed = value.trim();
    if (!trimmed) fail("El área no puede estar vacía");
    if (!this.areaOptions.includes(trimmed)) this.areaOptions.push(trimmed);
  }
  async removeAreaOption(value: string) {
    this.areaOptions = this.areaOptions.filter((o) => o !== value);
  }

  // Onboarding: campos personalizados ------------------------------------
  async listOnboardingFields() {
    return clone([...this.onboardingFields].sort((a, b) => a.order - b.order));
  }
  async createOnboardingField(field: OnboardingFieldDef) {
    const parsed = OnboardingFieldDefSchema.parse(field);
    if (this.onboardingFields.some((f) => f.id === parsed.id)) {
      fail(`Ya existe un campo con id: ${parsed.id}`);
    }
    this.onboardingFields.push(parsed);
    return clone(parsed);
  }
  async removeOnboardingField(id: string) {
    this.onboardingFields = this.onboardingFields.filter((f) => f.id !== id);
  }

  // Gamificación --------------------------------------------------------
  async getMoodEntry(userId: string, dayKey: string) {
    return clone(
      this.moodEntries.find((m) => m.userId === userId && m.dayKey === dayKey) ?? null,
    );
  }
  async setMoodEntry(entry: MoodEntry) {
    const parsed = MoodEntrySchema.parse(entry);
    const i = this.moodEntries.findIndex(
      (m) => m.userId === parsed.userId && m.dayKey === parsed.dayKey,
    );
    if (i >= 0) this.moodEntries[i] = parsed;
    else this.moodEntries.push(parsed);
    return clone(parsed);
  }

  // Certificados --------------------------------------------------------
  async listCertificates(userId: string) {
    return clone(this.certificates.filter((c) => c.userId === userId));
  }
  async getCertificate(userId: string, courseId: string) {
    return clone(
      this.certificates.find(
        (c) => c.userId === userId && c.courseId === courseId,
      ) ?? null,
    );
  }
  async getCertificateByCode(code: string) {
    return clone(this.certificates.find((c) => c.code === code) ?? null);
  }
  async issueCertificate(certificate: Certificate) {
    const parsed = CertificateSchema.parse(certificate);
    if (!this.users.some((u) => u.id === parsed.userId)) {
      fail(`Usuario no encontrado: ${parsed.userId}`);
    }
    if (!this.courses.some((c) => c.id === parsed.courseId)) {
      fail(`Curso no encontrado: ${parsed.courseId}`);
    }
    const existing = this.certificates.find(
      (c) => c.userId === parsed.userId && c.courseId === parsed.courseId,
    );
    if (existing) return clone(existing);
    this.certificates.push(parsed);
    return clone(parsed);
  }

  // Retos -------------------------------------------------------------------
  async listChallenges() {
    return clone(this.challenges);
  }
  async getChallenge(challengeId: string) {
    return clone(this.challenges.find((c) => c.id === challengeId) ?? null);
  }
  async createChallenge(challenge: Challenge) {
    const parsed = ChallengeSchema.parse(challenge);
    if (this.challenges.some((c) => c.id === parsed.id)) {
      fail(`Ya existe un reto con id: ${parsed.id}`);
    }
    this.challenges.push(parsed);
    return clone(parsed);
  }
  async listChallengeAttempts(userId: string) {
    return clone(this.challengeAttempts.filter((a) => a.userId === userId));
  }
  async createChallengeAttempt(attempt: ChallengeAttempt) {
    const parsed = ChallengeAttemptSchema.parse(attempt);
    if (!this.users.some((u) => u.id === parsed.userId)) {
      fail(`Usuario no encontrado: ${parsed.userId}`);
    }
    if (!this.challenges.some((c) => c.id === parsed.challengeId)) {
      fail(`Reto no encontrado: ${parsed.challengeId}`);
    }
    if (this.challengeAttempts.some((a) => a.id === parsed.id)) {
      fail(`Ya existe un intento con id: ${parsed.id}`);
    }
    this.challengeAttempts.push(parsed);
    return clone(parsed);
  }

  // Derivados ---------------------------------------------------------------
  async listCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    // Deriva eventos de las fechas de liberación de sesiones de cursos inscritos.
    const enrolled = this.enrollments
      .filter((e) => e.userId === userId)
      .map((e) => e.courseId);
    const events: CalendarEvent[] = [];
    for (const s of this.sessions) {
      if (enrolled.includes(s.courseId) && s.unlockDate) {
        events.push({
          id: `ev-unlock-${s.id}`,
          date: s.unlockDate,
          title: `Se libera: ${s.title}`,
          kind: "unlock",
          courseId: s.courseId,
        });
      }
    }
    return clone(events.sort((a, b) => a.date.localeCompare(b.date)));
  }

  // Utilidades no-contrato (para tipos que las pantallas puedan necesitar)
  async listAllModulesForCourse(courseId: string): Promise<Module[]> {
    const sessionIds = this.sessions
      .filter((s) => s.courseId === courseId)
      .map((s) => s.id);
    return clone(
      this.modules.filter((m) => m.sessionId && sessionIds.includes(m.sessionId)),
    );
  }
}
