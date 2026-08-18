/**
 * Implementación real (Postgres/Supabase) del contrato `Repository`.
 *
 * Mismo principio que `MockRepository`: valida con los esquemas Zod de
 * `domain/schemas.ts` antes de escribir (defensa en el borde), y traduce
 * entre las filas snake_case de Postgres y los tipos camelCase de
 * `domain/types.ts`. La integridad referencial (FKs) y el control de acceso
 * (quién puede leer/escribir qué) ya no los hace el repositorio — los aplica
 * Postgres (constraints) y RLS (`supabase/migrations/0002_rls.sql`).
 *
 * Errores: los métodos de `@supabase/supabase-js` devuelven `{ data, error }`
 * en vez de lanzar — `unwrap()` los convierte en excepciones para que el
 * resto de la app (que ya asume que un repositorio lanza en vez de devolver
 * un error silencioso, ver `MockRepository`) no tenga que cambiar.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Repository } from "@/lib/data/repository";
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
import { createClient } from "@/lib/supabase/client";

// ────────────────────────────────────────────────────────────────
// Mappers fila (snake_case) ↔ dominio (camelCase)
// ────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  email: string;
  role: User["role"];
  display_name: string;
  avatar_url: string | null;
  last_seen: string | null;
}
const toUser = (r: ProfileRow): User => ({
  id: r.id,
  email: r.email,
  role: r.role,
  displayName: r.display_name,
  avatarUrl: r.avatar_url ?? undefined,
  lastSeen: r.last_seen ?? undefined,
});

interface StudentProfileRow {
  user_id: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  area: string;
  cedula: string | null;
  custom_fields: Record<string, string> | null;
  completed: boolean;
  show_name_in_community: boolean | null;
  notify_unread_messages: boolean | null;
  notify_streak_reminder: boolean | null;
}
const toStudentProfile = (r: StudentProfileRow): StudentProfile => ({
  userId: r.user_id,
  nombres: r.nombres,
  apellidos: r.apellidos,
  cargo: r.cargo,
  area: r.area,
  cedula: r.cedula ?? undefined,
  customFields: r.custom_fields ?? undefined,
  completed: r.completed,
  showNameInCommunity: r.show_name_in_community ?? undefined,
  notifyUnreadMessages: r.notify_unread_messages ?? undefined,
  notifyStreakReminder: r.notify_streak_reminder ?? undefined,
});
const fromStudentProfile = (p: StudentProfile) => ({
  user_id: p.userId,
  nombres: p.nombres,
  apellidos: p.apellidos,
  cargo: p.cargo,
  area: p.area,
  cedula: p.cedula ?? null,
  custom_fields: p.customFields ?? null,
  completed: p.completed,
  show_name_in_community: p.showNameInCommunity ?? null,
  notify_unread_messages: p.notifyUnreadMessages ?? null,
  notify_streak_reminder: p.notifyStreakReminder ?? null,
});

interface CourseRow {
  id: string;
  title: string;
  description: string;
  certificate_description: string | null;
  certificate_duration_hours: number | null;
  cover_url: string | null;
  published: boolean;
  enrollment_open: boolean;
  teacher_name: string;
}
const toCourse = (r: CourseRow): Course => ({
  id: r.id,
  title: r.title,
  description: r.description,
  certificateDescription: r.certificate_description ?? undefined,
  certificateDurationHours: r.certificate_duration_hours ?? undefined,
  coverUrl: r.cover_url ?? undefined,
  published: r.published,
  enrollmentOpen: r.enrollment_open,
  teacherName: r.teacher_name,
});
const fromCourse = (c: Course) => ({
  id: c.id,
  title: c.title,
  description: c.description,
  certificate_description: c.certificateDescription ?? null,
  certificate_duration_hours: c.certificateDurationHours ?? null,
  cover_url: c.coverUrl ?? null,
  published: c.published,
  enrollment_open: c.enrollmentOpen,
  teacher_name: c.teacherName,
});

interface SessionRow {
  id: string;
  course_id: string;
  order_index: number;
  title: string;
  unlock_date: string | null;
}
const toSession = (r: SessionRow): Session => ({
  id: r.id,
  courseId: r.course_id,
  order: r.order_index,
  title: r.title,
  unlockDate: r.unlock_date ?? undefined,
});
const fromSession = (s: Session) => ({
  id: s.id,
  course_id: s.courseId,
  order_index: s.order,
  title: s.title,
  unlock_date: s.unlockDate ?? null,
});

interface ModuleRow {
  id: string;
  session_id: string | null;
  context: Module["context"];
  order_index: number;
  type: Module["type"];
  title: string;
  description: string;
  video_url: string | null;
  content_html: string | null;
  duration_min: number | null;
}
const toModule = (r: ModuleRow): Module => ({
  id: r.id,
  sessionId: r.session_id,
  context: r.context,
  order: r.order_index,
  type: r.type,
  title: r.title,
  description: r.description,
  videoUrl: r.video_url ?? undefined,
  contentHtml: r.content_html ?? undefined,
  durationMin: r.duration_min ?? undefined,
});
const fromModule = (m: Module) => ({
  id: m.id,
  session_id: m.sessionId,
  context: m.context,
  order_index: m.order,
  type: m.type,
  title: m.title,
  description: m.description,
  video_url: m.videoUrl ?? null,
  content_html: m.contentHtml ?? null,
  duration_min: m.durationMin ?? null,
});

interface ArchetypeRow {
  id: string;
  course_id: string;
  name: string;
  description: string;
  order_index: number;
}
const toArchetype = (r: ArchetypeRow): Archetype => ({
  id: r.id,
  courseId: r.course_id,
  name: r.name,
  description: r.description,
  order: r.order_index,
});
const fromArchetype = (a: Archetype) => ({
  id: a.id,
  course_id: a.courseId,
  name: a.name,
  description: a.description,
  order_index: a.order,
});

interface EvaluationRow {
  id: string;
  course_id: string | null;
  session_id: string | null;
  tutorial_module_id: string | null;
  kind: Evaluation["kind"];
  title: string;
  max_attempts: number;
  wait_hours: number;
  passing_score: number | null;
  is_active: boolean;
  placement_after_module_id: string | null;
}
const toEvaluation = (r: EvaluationRow): Evaluation => ({
  id: r.id,
  courseId: r.course_id ?? undefined,
  sessionId: r.session_id ?? undefined,
  tutorialModuleId: r.tutorial_module_id ?? undefined,
  kind: r.kind,
  title: r.title,
  maxAttempts: r.max_attempts,
  waitHours: r.wait_hours,
  passingScore: r.passing_score ?? undefined,
  isActive: r.is_active,
  placementAfterModuleId: r.placement_after_module_id ?? undefined,
});
const fromEvaluation = (e: Evaluation) => ({
  id: e.id,
  course_id: e.courseId ?? null,
  session_id: e.sessionId ?? null,
  tutorial_module_id: e.tutorialModuleId ?? null,
  kind: e.kind,
  title: e.title,
  max_attempts: e.maxAttempts,
  wait_hours: e.waitHours,
  passing_score: e.passingScore ?? null,
  is_active: e.isActive,
  placement_after_module_id: e.placementAfterModuleId ?? null,
});

interface LearningOutcomeRow {
  id: string;
  evaluation_id: string;
  code: string;
  name: string;
  expected_level: number;
}
const toOutcome = (r: LearningOutcomeRow): LearningOutcome => ({
  id: r.id,
  evaluationId: r.evaluation_id,
  code: r.code,
  name: r.name,
  expectedLevel: r.expected_level,
});
const fromOutcome = (o: LearningOutcome) => ({
  id: o.id,
  evaluation_id: o.evaluationId,
  code: o.code,
  name: o.name,
  expected_level: o.expectedLevel,
});

interface QuestionRow {
  id: string;
  evaluation_id: string;
  order_index: number;
  type: Question["type"];
  text: string;
  image_url: string | null;
  points: number;
  outcome_id: string | null;
  correct_value: number | null;
  tolerance: number | null;
}
const toQuestion = (r: QuestionRow): Question => ({
  id: r.id,
  evaluationId: r.evaluation_id,
  order: r.order_index,
  type: r.type,
  text: r.text,
  imageUrl: r.image_url ?? undefined,
  points: r.points,
  outcomeId: r.outcome_id ?? undefined,
  correctValue: r.correct_value ?? undefined,
  tolerance: r.tolerance ?? undefined,
});
const fromQuestion = (q: Question) => ({
  id: q.id,
  evaluation_id: q.evaluationId,
  order_index: q.order,
  type: q.type,
  text: q.text,
  image_url: q.imageUrl ?? null,
  points: q.points,
  outcome_id: q.outcomeId ?? null,
  correct_value: q.correctValue ?? null,
  tolerance: q.tolerance ?? null,
});

interface QuestionOptionRow {
  id: string;
  question_id: string;
  text: string;
  image_url: string | null;
  is_correct: boolean | null;
  correct_rank: number | null;
  archetype_id: string | null;
}
const toOption = (r: QuestionOptionRow): QuestionOption => ({
  id: r.id,
  questionId: r.question_id,
  text: r.text,
  imageUrl: r.image_url ?? undefined,
  isCorrect: r.is_correct ?? undefined,
  correctRank: r.correct_rank ?? undefined,
  archetypeId: r.archetype_id ?? undefined,
});
const fromOption = (o: QuestionOption) => ({
  id: o.id,
  question_id: o.questionId,
  text: o.text,
  image_url: o.imageUrl ?? null,
  is_correct: o.isCorrect ?? null,
  correct_rank: o.correctRank ?? null,
  archetype_id: o.archetypeId ?? null,
});

interface EnrollmentRow {
  user_id: string;
  course_id: string;
  enrolled_at: string;
}
const toEnrollment = (r: EnrollmentRow): Enrollment => ({
  userId: r.user_id,
  courseId: r.course_id,
  enrolledAt: r.enrolled_at,
});
const fromEnrollment = (e: Enrollment) => ({
  user_id: e.userId,
  course_id: e.courseId,
  enrolled_at: e.enrolledAt,
});

interface ModuleProgressRow {
  user_id: string;
  module_id: string;
  completed: boolean;
  completed_at: string | null;
}
const toProgress = (r: ModuleProgressRow): ModuleProgress => ({
  userId: r.user_id,
  moduleId: r.module_id,
  completed: r.completed,
  completedAt: r.completed_at ?? undefined,
});
const fromProgress = (p: ModuleProgress) => ({
  user_id: p.userId,
  module_id: p.moduleId,
  completed: p.completed,
  completed_at: p.completedAt ?? null,
});

interface AttemptRow {
  id: string;
  user_id: string;
  evaluation_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  status: Attempt["status"];
}
const toAttempt = (r: AttemptRow): Attempt => ({
  id: r.id,
  userId: r.user_id,
  evaluationId: r.evaluation_id,
  startedAt: r.started_at,
  submittedAt: r.submitted_at ?? undefined,
  score: r.score ?? undefined,
  status: r.status,
});
const fromAttempt = (a: Attempt) => ({
  id: a.id,
  user_id: a.userId,
  evaluation_id: a.evaluationId,
  started_at: a.startedAt,
  submitted_at: a.submittedAt ?? null,
  score: a.score ?? null,
  status: a.status,
});

interface AnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[] | null;
  open_text: string | null;
  scale_value: number | null;
  ranking_order: string[] | null;
  points_awarded: number | null;
  is_correct: boolean | null;
}
const toAnswer = (r: AnswerRow): Answer => ({
  id: r.id,
  attemptId: r.attempt_id,
  questionId: r.question_id,
  selectedOptionIds: r.selected_option_ids ?? undefined,
  openText: r.open_text ?? undefined,
  scaleValue: r.scale_value ?? undefined,
  rankingOrder: r.ranking_order ?? undefined,
  pointsAwarded: r.points_awarded ?? undefined,
  isCorrect: r.is_correct ?? undefined,
});
const fromAnswer = (a: Answer) => ({
  id: a.id,
  attempt_id: a.attemptId,
  question_id: a.questionId,
  selected_option_ids: a.selectedOptionIds ?? null,
  open_text: a.openText ?? null,
  scale_value: a.scaleValue ?? null,
  ranking_order: a.rankingOrder ?? null,
  points_awarded: a.pointsAwarded ?? null,
  is_correct: a.isCorrect ?? null,
});

interface OutcomeScoreRow {
  attempt_id: string;
  outcome_id: string;
  expected: number;
  achieved: number;
}
const toOutcomeScore = (r: OutcomeScoreRow): OutcomeScore => ({
  attemptId: r.attempt_id,
  outcomeId: r.outcome_id,
  expected: r.expected,
  achieved: r.achieved,
});
const fromOutcomeScore = (s: OutcomeScore) => ({
  attempt_id: s.attemptId,
  outcome_id: s.outcomeId,
  expected: s.expected,
  achieved: s.achieved,
});

interface MessageRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  course_id: string | null;
  body: string;
  created_at: string;
  read: boolean;
}
const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  fromUserId: r.from_user_id,
  toUserId: r.to_user_id,
  courseId: r.course_id ?? undefined,
  body: r.body,
  createdAt: r.created_at,
  read: r.read,
});
const fromMessage = (m: Message) => ({
  id: m.id,
  from_user_id: m.fromUserId,
  to_user_id: m.toUserId,
  course_id: m.courseId ?? null,
  body: m.body,
  created_at: m.createdAt,
  read: m.read,
});

interface CommunityPostRow {
  id: string;
  author_id: string;
  body: string;
  category: CommunityPost["category"] | null;
  created_at: string;
}
const toCommunityPost = (r: CommunityPostRow): CommunityPost => ({
  id: r.id,
  authorId: r.author_id,
  body: r.body,
  category: r.category ?? undefined,
  createdAt: r.created_at,
});
const fromCommunityPost = (p: CommunityPost) => ({
  id: p.id,
  author_id: p.authorId,
  body: p.body,
  category: p.category ?? null,
  created_at: p.createdAt,
});

interface CommunityLikeRow {
  post_id: string;
  user_id: string;
  created_at: string;
}
const toCommunityLike = (r: CommunityLikeRow): CommunityLike => ({
  postId: r.post_id,
  userId: r.user_id,
  createdAt: r.created_at,
});

interface CommunityReplyRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
}
const toCommunityReply = (r: CommunityReplyRow): CommunityReply => ({
  id: r.id,
  postId: r.post_id,
  authorId: r.author_id,
  body: r.body,
  createdAt: r.created_at,
});
const fromCommunityReply = (rep: CommunityReply) => ({
  id: rep.id,
  post_id: rep.postId,
  author_id: rep.authorId,
  body: rep.body,
  created_at: rep.createdAt,
});

interface OnboardingFieldRow {
  id: string;
  label: string;
  type: OnboardingFieldDef["type"];
  options: string[] | null;
  order_index: number;
}
const toOnboardingField = (r: OnboardingFieldRow): OnboardingFieldDef => ({
  id: r.id,
  label: r.label,
  type: r.type,
  options: r.options ?? undefined,
  order: r.order_index,
});
const fromOnboardingField = (f: OnboardingFieldDef) => ({
  id: f.id,
  label: f.label,
  type: f.type,
  options: f.options ?? null,
  order_index: f.order,
});

interface MoodEntryRow {
  user_id: string;
  day_key: string;
  mood: MoodEntry["mood"];
  comment: string | null;
  created_at: string;
}
const toMoodEntry = (r: MoodEntryRow): MoodEntry => ({
  userId: r.user_id,
  dayKey: r.day_key,
  mood: r.mood,
  comment: r.comment ?? undefined,
  createdAt: r.created_at,
});
const fromMoodEntry = (m: MoodEntry) => ({
  user_id: m.userId,
  day_key: m.dayKey,
  mood: m.mood,
  comment: m.comment ?? null,
  created_at: m.createdAt,
});

interface CertificateRow {
  code: string;
  user_id: string;
  course_id: string;
  student_name: string;
  course_title: string;
  course_description: string;
  teacher_name: string;
  duration_min: number;
  issued_at: string;
}
const toCertificate = (r: CertificateRow): Certificate => ({
  code: r.code,
  userId: r.user_id,
  courseId: r.course_id,
  studentName: r.student_name,
  courseTitle: r.course_title,
  courseDescription: r.course_description,
  teacherName: r.teacher_name,
  durationMin: r.duration_min,
  issuedAt: r.issued_at,
});
const fromCertificate = (c: Certificate) => ({
  code: c.code,
  user_id: c.userId,
  course_id: c.courseId,
  student_name: c.studentName,
  course_title: c.courseTitle,
  course_description: c.courseDescription,
  teacher_name: c.teacherName,
  duration_min: c.durationMin,
  issued_at: c.issuedAt,
});

interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  difficulty: Challenge["difficulty"];
  content_html: string;
  created_at: string;
}
const toChallenge = (r: ChallengeRow): Challenge => ({
  id: r.id,
  title: r.title,
  description: r.description,
  difficulty: r.difficulty,
  contentHtml: r.content_html,
  createdAt: r.created_at,
});
const fromChallenge = (c: Challenge) => ({
  id: c.id,
  title: c.title,
  description: c.description,
  difficulty: c.difficulty,
  content_html: c.contentHtml,
  created_at: c.createdAt,
});

interface ChallengeAttemptRow {
  id: string;
  user_id: string;
  challenge_id: string;
  score: number;
  total: number;
  completed_at: string;
}
const toChallengeAttempt = (r: ChallengeAttemptRow): ChallengeAttempt => ({
  id: r.id,
  userId: r.user_id,
  challengeId: r.challenge_id,
  score: r.score,
  total: r.total,
  completedAt: r.completed_at,
});
const fromChallengeAttempt = (a: ChallengeAttempt) => ({
  id: a.id,
  user_id: a.userId,
  challenge_id: a.challengeId,
  score: a.score,
  total: a.total,
  completed_at: a.completedAt,
});

// ────────────────────────────────────────────────────────────────

export class SupabaseRepository implements Repository {
  private supabase: SupabaseClient = createClient();

  // Identidad ---------------------------------------------------------------
  async getCurrentUser() {
    const {
      data: { user: authUser },
    } = await this.supabase.auth.getUser();
    if (!authUser) return null;
    return this.getUserById(authUser.id);
  }
  async getUserById(id: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toUser(data as ProfileRow) : null;
  }
  async listUsersByRole(role: User["role"]) {
    const { data, error } = await this.supabase.from("profiles").select("*").eq("role", role);
    if (error) throw new Error(error.message);
    return (data as ProfileRow[]).map(toUser);
  }
  async getStudentProfile(userId: string) {
    const { data, error } = await this.supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toStudentProfile(data as StudentProfileRow) : null;
  }
  async saveStudentProfile(profile: StudentProfile) {
    const parsed = StudentProfileSchema.parse(profile);
    const { data, error } = await this.supabase
      .from("student_profiles")
      .upsert(fromStudentProfile(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toStudentProfile(data as StudentProfileRow);
  }
  async listStudentProfiles() {
    const { data, error } = await this.supabase.from("student_profiles").select("*");
    if (error) throw new Error(error.message);
    return (data as StudentProfileRow[]).map(toStudentProfile);
  }

  // Cursos / sesiones / módulos --------------------------------------------
  async listCourses() {
    const { data, error } = await this.supabase.from("courses").select("*");
    if (error) throw new Error(error.message);
    return (data as CourseRow[]).map(toCourse);
  }
  async getCourse(courseId: string) {
    const { data, error } = await this.supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCourse(data as CourseRow) : null;
  }
  async createCourse(course: Course) {
    const parsed = CourseSchema.parse(course);
    const { data, error } = await this.supabase
      .from("courses")
      .insert(fromCourse(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCourse(data as CourseRow);
  }
  async updateCourse(course: Course) {
    const parsed = CourseSchema.parse(course);
    const { data, error } = await this.supabase
      .from("courses")
      .update(fromCourse(parsed))
      .eq("id", parsed.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCourse(data as CourseRow);
  }
  async listSessions(courseId: string) {
    const { data, error } = await this.supabase
      .from("sessions")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");
    if (error) throw new Error(error.message);
    return (data as SessionRow[]).map(toSession);
  }
  async createSession(session: Session) {
    const parsed = SessionSchema.parse(session);
    const { data, error } = await this.supabase
      .from("sessions")
      .insert(fromSession(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toSession(data as SessionRow);
  }
  async updateSession(session: Session) {
    const parsed = SessionSchema.parse(session);
    const { data, error } = await this.supabase
      .from("sessions")
      .update(fromSession(parsed))
      .eq("id", parsed.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toSession(data as SessionRow);
  }
  async listModules(sessionId: string) {
    const { data, error } = await this.supabase
      .from("modules")
      .select("*")
      .eq("session_id", sessionId)
      .order("order_index");
    if (error) throw new Error(error.message);
    return (data as ModuleRow[]).map(toModule);
  }
  async createModule(module: Module) {
    const parsed = ModuleSchema.parse(module);
    const { data, error } = await this.supabase
      .from("modules")
      .insert(fromModule(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModule(data as ModuleRow);
  }
  async updateModule(module: Module) {
    const parsed = ModuleSchema.parse(module);
    const { data, error } = await this.supabase
      .from("modules")
      .update(fromModule(parsed))
      .eq("id", parsed.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModule(data as ModuleRow);
  }
  async listTutorials() {
    const { data, error } = await this.supabase
      .from("modules")
      .select("*")
      .eq("context", "tutorial")
      .order("order_index");
    if (error) throw new Error(error.message);
    return (data as ModuleRow[]).map(toModule);
  }
  async getModule(moduleId: string) {
    const { data, error } = await this.supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toModule(data as ModuleRow) : null;
  }

  // Inscripción / progreso --------------------------------------------------
  async listEnrollments(userId: string) {
    const { data, error } = await this.supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data as EnrollmentRow[]).map(toEnrollment);
  }
  async listEnrollmentsByCourse(courseId: string) {
    const { data, error } = await this.supabase
      .from("enrollments")
      .select("*")
      .eq("course_id", courseId);
    if (error) throw new Error(error.message);
    return (data as EnrollmentRow[]).map(toEnrollment);
  }
  async createEnrollment(enrollment: Enrollment) {
    const parsed = EnrollmentSchema.parse(enrollment);
    const { data, error } = await this.supabase
      .from("enrollments")
      .insert(fromEnrollment(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toEnrollment(data as EnrollmentRow);
  }
  async removeEnrollment(userId: string, courseId: string) {
    const { error } = await this.supabase
      .from("enrollments")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", courseId);
    if (error) throw new Error(error.message);
  }
  async listModuleProgress(userId: string) {
    const { data, error } = await this.supabase
      .from("module_progress")
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data as ModuleProgressRow[]).map(toProgress);
  }
  async setModuleProgress(progress: ModuleProgress) {
    const parsed = ModuleProgressSchema.parse(progress);
    const { data, error } = await this.supabase
      .from("module_progress")
      .upsert(fromProgress(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toProgress(data as ModuleProgressRow);
  }

  // Evaluaciones ------------------------------------------------------------
  async listEvaluations(courseId: string) {
    const { data, error } = await this.supabase
      .from("evaluations")
      .select("*")
      .eq("course_id", courseId);
    if (error) throw new Error(error.message);
    return (data as EvaluationRow[]).map(toEvaluation);
  }
  async getEvaluation(evaluationId: string) {
    const { data, error } = await this.supabase
      .from("evaluations")
      .select("*")
      .eq("id", evaluationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toEvaluation(data as EvaluationRow) : null;
  }
  async createEvaluation(evaluation: Evaluation) {
    const parsed = EvaluationSchema.parse(evaluation);
    const { data, error } = await this.supabase
      .from("evaluations")
      .insert(fromEvaluation(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toEvaluation(data as EvaluationRow);
  }
  async getTutorialQuiz(tutorialModuleId: string) {
    const { data, error } = await this.supabase
      .from("evaluations")
      .select("*")
      .eq("kind", "tutorial_quiz")
      .eq("tutorial_module_id", tutorialModuleId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toEvaluation(data as EvaluationRow) : undefined;
  }
  async updateEvaluation(evaluation: Evaluation) {
    const parsed = EvaluationSchema.parse(evaluation);
    const { data, error } = await this.supabase
      .from("evaluations")
      .update(fromEvaluation(parsed))
      .eq("id", parsed.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toEvaluation(data as EvaluationRow);
  }
  async listOutcomes(evaluationId: string) {
    const { data, error } = await this.supabase
      .from("learning_outcomes")
      .select("*")
      .eq("evaluation_id", evaluationId);
    if (error) throw new Error(error.message);
    return (data as LearningOutcomeRow[]).map(toOutcome);
  }
  async createOutcome(outcome: LearningOutcome) {
    const parsed = LearningOutcomeSchema.parse(outcome);
    const { data, error } = await this.supabase
      .from("learning_outcomes")
      .insert(fromOutcome(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toOutcome(data as LearningOutcomeRow);
  }
  async listQuestions(evaluationId: string) {
    const { data, error } = await this.supabase
      .from("questions")
      .select("*")
      .eq("evaluation_id", evaluationId)
      .order("order_index");
    if (error) throw new Error(error.message);
    return (data as QuestionRow[]).map(toQuestion);
  }
  async createQuestion(question: Question) {
    const parsed = QuestionSchema.parse(question);
    const { data, error } = await this.supabase
      .from("questions")
      .insert(fromQuestion(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toQuestion(data as QuestionRow);
  }
  async listOptions(questionId: string) {
    const { data, error } = await this.supabase
      .from("question_options")
      .select("*")
      .eq("question_id", questionId);
    if (error) throw new Error(error.message);
    return (data as QuestionOptionRow[]).map(toOption);
  }
  async createOption(option: QuestionOption) {
    const parsed = QuestionOptionSchema.parse(option);
    const { data, error } = await this.supabase
      .from("question_options")
      .insert(fromOption(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toOption(data as QuestionOptionRow);
  }

  // Arquetipos --------------------------------------------------------------
  async listArchetypes(courseId: string) {
    const { data, error } = await this.supabase
      .from("archetypes")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");
    if (error) throw new Error(error.message);
    return (data as ArchetypeRow[]).map(toArchetype);
  }
  async createArchetype(archetype: Archetype) {
    const parsed = ArchetypeSchema.parse(archetype);
    const { data, error } = await this.supabase
      .from("archetypes")
      .insert(fromArchetype(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toArchetype(data as ArchetypeRow);
  }
  async removeArchetype(id: string) {
    const { error } = await this.supabase.from("archetypes").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Intentos / respuestas ---------------------------------------------------
  async listAttempts(userId: string, evaluationId: string) {
    const { data, error } = await this.supabase
      .from("attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("evaluation_id", evaluationId);
    if (error) throw new Error(error.message);
    return (data as AttemptRow[]).map(toAttempt);
  }
  async listAttemptsByEvaluation(evaluationId: string) {
    const { data, error } = await this.supabase
      .from("attempts")
      .select("*")
      .eq("evaluation_id", evaluationId);
    if (error) throw new Error(error.message);
    return (data as AttemptRow[]).map(toAttempt);
  }
  async createAttempt(attempt: Attempt) {
    const parsed = AttemptSchema.parse(attempt);
    const { data, error } = await this.supabase
      .from("attempts")
      .insert(fromAttempt(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toAttempt(data as AttemptRow);
  }
  async saveAnswers(answers: Answer[]) {
    const rows = answers.map((a) => fromAnswer(AnswerSchema.parse(a)));
    if (rows.length === 0) return;
    const { error } = await this.supabase.from("answers").insert(rows);
    if (error) throw new Error(error.message);
  }
  async listAnswers(attemptId: string) {
    const { data, error } = await this.supabase
      .from("answers")
      .select("*")
      .eq("attempt_id", attemptId);
    if (error) throw new Error(error.message);
    return (data as AnswerRow[]).map(toAnswer);
  }
  async saveOutcomeScores(scores: OutcomeScore[]) {
    const rows = scores.map((s) => fromOutcomeScore(OutcomeScoreSchema.parse(s)));
    if (rows.length === 0) return;
    const { error } = await this.supabase.from("outcome_scores").insert(rows);
    if (error) throw new Error(error.message);
  }
  async listOutcomeScores(attemptId: string) {
    const { data, error } = await this.supabase
      .from("outcome_scores")
      .select("*")
      .eq("attempt_id", attemptId);
    if (error) throw new Error(error.message);
    return (data as OutcomeScoreRow[]).map(toOutcomeScore);
  }
  async getBonusAttempts(userId: string, evaluationId: string) {
    const { data, error } = await this.supabase
      .from("bonus_attempts")
      .select("count")
      .eq("user_id", userId)
      .eq("evaluation_id", evaluationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.count ?? 0;
  }
  async grantBonusAttempt(userId: string, evaluationId: string) {
    const current = await this.getBonusAttempts(userId, evaluationId);
    const { error } = await this.supabase
      .from("bonus_attempts")
      .upsert({ user_id: userId, evaluation_id: evaluationId, count: current + 1 });
    if (error) throw new Error(error.message);
  }

  // Comunicación ------------------------------------------------------------
  async listMessages(userId: string) {
    const { data, error } = await this.supabase
      .from("messages")
      .select("*")
      .or(`to_user_id.eq.${userId},from_user_id.eq.${userId}`)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data as MessageRow[]).map(toMessage);
  }
  async sendMessage(message: Message) {
    const parsed = MessageSchema.parse(message);
    const { data, error } = await this.supabase
      .from("messages")
      .insert(fromMessage(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toMessage(data as MessageRow);
  }
  async markConversationRead(userId: string, otherUserId: string) {
    const { error } = await this.supabase
      .from("messages")
      .update({ read: true })
      .eq("to_user_id", userId)
      .eq("from_user_id", otherUserId);
    if (error) throw new Error(error.message);
  }

  // Comunidad -----------------------------------------------------------
  async listCommunityPosts() {
    const { data, error } = await this.supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as CommunityPostRow[]).map(toCommunityPost);
  }
  async createCommunityPost(post: CommunityPost) {
    const parsed = CommunityPostSchema.parse(post);
    const { data, error } = await this.supabase
      .from("community_posts")
      .insert(fromCommunityPost(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCommunityPost(data as CommunityPostRow);
  }
  async listCommunityLikes(postId: string) {
    const { data, error } = await this.supabase
      .from("community_likes")
      .select("*")
      .eq("post_id", postId);
    if (error) throw new Error(error.message);
    return (data as CommunityLikeRow[]).map(toCommunityLike);
  }
  async toggleCommunityLike(postId: string, userId: string) {
    const { data: existing, error: findError } = await this.supabase
      .from("community_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (findError) throw new Error(findError.message);

    if (existing) {
      const { error } = await this.supabase
        .from("community_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await this.supabase
        .from("community_likes")
        .insert({ post_id: postId, user_id: userId, created_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    }

    const { count, error: countError } = await this.supabase
      .from("community_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);
    if (countError) throw new Error(countError.message);

    return { liked: !existing, count: count ?? 0 };
  }
  async listCommunityReplies(postId: string) {
    const { data, error } = await this.supabase
      .from("community_replies")
      .select("*")
      .eq("post_id", postId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data as CommunityReplyRow[]).map(toCommunityReply);
  }
  async createCommunityReply(reply: CommunityReply) {
    const parsed = CommunityReplySchema.parse(reply);
    const { data, error } = await this.supabase
      .from("community_replies")
      .insert(fromCommunityReply(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCommunityReply(data as CommunityReplyRow);
  }

  // Configuración ---------------------------------------------------------
  async listAreaOptions() {
    const { data, error } = await this.supabase.from("area_options").select("value").order("value");
    if (error) throw new Error(error.message);
    return (data as { value: string }[]).map((r) => r.value);
  }
  async addAreaOption(value: string) {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("El área no puede estar vacía");
    const { error } = await this.supabase.from("area_options").upsert({ value: trimmed });
    if (error) throw new Error(error.message);
  }
  async removeAreaOption(value: string) {
    const { error } = await this.supabase.from("area_options").delete().eq("value", value);
    if (error) throw new Error(error.message);
  }

  // Onboarding: campos personalizados --------------------------------------
  async listOnboardingFields() {
    const { data, error } = await this.supabase
      .from("onboarding_field_defs")
      .select("*")
      .order("order_index");
    if (error) throw new Error(error.message);
    return (data as OnboardingFieldRow[]).map(toOnboardingField);
  }
  async createOnboardingField(field: OnboardingFieldDef) {
    const parsed = OnboardingFieldDefSchema.parse(field);
    const { data, error } = await this.supabase
      .from("onboarding_field_defs")
      .insert(fromOnboardingField(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toOnboardingField(data as OnboardingFieldRow);
  }
  async removeOnboardingField(id: string) {
    const { error } = await this.supabase.from("onboarding_field_defs").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Gamificación ------------------------------------------------------------
  async getMoodEntry(userId: string, dayKey: string) {
    const { data, error } = await this.supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("day_key", dayKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toMoodEntry(data as MoodEntryRow) : null;
  }
  async setMoodEntry(entry: MoodEntry) {
    const parsed = MoodEntrySchema.parse(entry);
    const { data, error } = await this.supabase
      .from("mood_entries")
      .upsert(fromMoodEntry(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toMoodEntry(data as MoodEntryRow);
  }

  // Certificados --------------------------------------------------------
  async listCertificates(userId: string) {
    const { data, error } = await this.supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data as CertificateRow[]).map(toCertificate);
  }
  async getCertificate(userId: string, courseId: string) {
    const { data, error } = await this.supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCertificate(data as CertificateRow) : null;
  }
  async getCertificateByCode(code: string) {
    const { data, error } = await this.supabase
      .from("certificates")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCertificate(data as CertificateRow) : null;
  }
  async issueCertificate(certificate: Certificate) {
    const parsed = CertificateSchema.parse(certificate);
    const { data: existing, error: findError } = await this.supabase
      .from("certificates")
      .select("*")
      .eq("user_id", parsed.userId)
      .eq("course_id", parsed.courseId)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (existing) return toCertificate(existing as CertificateRow);

    const { data, error } = await this.supabase
      .from("certificates")
      .insert(fromCertificate(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toCertificate(data as CertificateRow);
  }

  // Retos -------------------------------------------------------------------
  async listChallenges() {
    const { data, error } = await this.supabase.from("challenges").select("*");
    if (error) throw new Error(error.message);
    return (data as ChallengeRow[]).map(toChallenge);
  }
  async getChallenge(challengeId: string) {
    const { data, error } = await this.supabase
      .from("challenges")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toChallenge(data as ChallengeRow) : null;
  }
  async createChallenge(challenge: Challenge) {
    const parsed = ChallengeSchema.parse(challenge);
    const { data, error } = await this.supabase
      .from("challenges")
      .insert(fromChallenge(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toChallenge(data as ChallengeRow);
  }
  async listChallengeAttempts(userId: string) {
    const { data, error } = await this.supabase
      .from("challenge_attempts")
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data as ChallengeAttemptRow[]).map(toChallengeAttempt);
  }
  async createChallengeAttempt(attempt: ChallengeAttempt) {
    const parsed = ChallengeAttemptSchema.parse(attempt);
    const { data, error } = await this.supabase
      .from("challenge_attempts")
      .insert(fromChallengeAttempt(parsed))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toChallengeAttempt(data as ChallengeAttemptRow);
  }

  // Derivados ---------------------------------------------------------------
  async listCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    const { data: enrollments, error: enrollError } = await this.supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId);
    if (enrollError) throw new Error(enrollError.message);

    const courseIds = (enrollments ?? []).map((e) => e.course_id as string);
    if (courseIds.length === 0) return [];

    const { data: sessions, error: sessError } = await this.supabase
      .from("sessions")
      .select("id, course_id, title, unlock_date")
      .in("course_id", courseIds)
      .not("unlock_date", "is", null);
    if (sessError) throw new Error(sessError.message);

    const events: CalendarEvent[] = (sessions ?? []).map((s) => ({
      id: `ev-unlock-${s.id}`,
      date: s.unlock_date as string,
      title: `Se libera: ${s.title}`,
      kind: "unlock" as const,
      courseId: s.course_id as string,
    }));
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }
}
