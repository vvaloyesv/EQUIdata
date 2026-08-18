/**
 * Esquemas Zod que espejan `domain/types.ts` — validan la forma de los datos
 * en el borde de cada mutación del repositorio (spec: "que la base aguante").
 * Es la misma defensa que tendría una API real antes de tocar la base de
 * datos; aquí protege contra un formulario mal armado o una llamada directa
 * al repositorio con datos incompletos.
 */

import { z } from "zod";

const isoDate = z.string().min(1, "Fecha ISO requerida");
const nonEmpty = z.string().trim().min(1, "No puede estar vacío");

export const RoleSchema = z.enum(["student", "teacher"]);

export const UserSchema = z.object({
  id: nonEmpty,
  email: z.string().trim().email(),
  role: RoleSchema,
  displayName: nonEmpty,
  avatarUrl: z.string().optional(),
  lastSeen: isoDate.optional(),
});

export const StudentProfileSchema = z.object({
  userId: nonEmpty,
  nombres: nonEmpty,
  apellidos: nonEmpty,
  cargo: nonEmpty,
  area: nonEmpty,
  documentType: nonEmpty,
  documentNumber: nonEmpty,
  customFields: z.record(z.string(), z.string()).optional(),
  completed: z.boolean(),
  showNameInCommunity: z.boolean().optional(),
  notifyUnreadMessages: z.boolean().optional(),
  notifyStreakReminder: z.boolean().optional(),
});

export const OnboardingFieldDefSchema = z.object({
  id: nonEmpty,
  label: nonEmpty,
  type: z.enum(["text", "select"]),
  options: z.array(z.string()).optional(),
  order: z.number().int().nonnegative(),
});

export const ChallengeDifficultySchema = z.enum(["Básico", "Intermedio", "Avanzado"]);

export const ChallengeSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  description: z.string(),
  difficulty: ChallengeDifficultySchema,
  contentHtml: nonEmpty,
  createdAt: isoDate,
});

export const ChallengeAttemptSchema = z.object({
  id: nonEmpty,
  userId: nonEmpty,
  challengeId: nonEmpty,
  score: z.number().nonnegative(),
  total: z.number().positive(),
  completedAt: isoDate,
});

export const CourseSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  description: z.string(),
  certificateDescription: z.string().optional(),
  certificateDurationHours: z.number().nonnegative().optional(),
  coverUrl: z.string().optional(),
  published: z.boolean(),
  enrollmentOpen: z.boolean(),
  teacherName: nonEmpty,
});

export const SessionSchema = z.object({
  id: nonEmpty,
  courseId: nonEmpty,
  order: z.number().int().positive(),
  title: nonEmpty,
  unlockDate: isoDate.optional(),
});

export const ModuleSchema = z.object({
  id: nonEmpty,
  sessionId: z.string().nullable(),
  context: z.enum(["course", "tutorial"]),
  order: z.number().int().positive(),
  type: z.enum(["video", "html"]),
  title: nonEmpty,
  description: z.string(),
  videoUrl: z.string().optional(),
  contentHtml: z.string().optional(),
  durationMin: z.number().nonnegative().optional(),
});

export const EvaluationKindSchema = z.enum([
  "diagnostic_initial",
  "quiz",
  "diagnostic_final",
  "interest_onboarding",
  "tutorial_quiz",
]);

export const EvaluationSchema = z.object({
  id: nonEmpty,
  courseId: z.string().optional(),
  sessionId: z.string().optional(),
  tutorialModuleId: z.string().optional(),
  kind: EvaluationKindSchema,
  title: nonEmpty,
  maxAttempts: z.number().int().positive(),
  waitHours: z.number().nonnegative(),
  passingScore: z.number().min(0).max(100).optional(),
  isActive: z.boolean(),
  placementAfterModuleId: z.string().optional(),
});

export const LearningOutcomeSchema = z.object({
  id: nonEmpty,
  evaluationId: nonEmpty,
  code: nonEmpty,
  name: nonEmpty,
  expectedLevel: z.number().min(0).max(100),
});

export const QuestionTypeSchema = z.enum([
  "single",
  "multiple",
  "open",
  "scale",
  "ranking",
]);

export const QuestionSchema = z.object({
  id: nonEmpty,
  evaluationId: nonEmpty,
  order: z.number().int().positive(),
  type: QuestionTypeSchema,
  text: nonEmpty,
  imageUrl: z.string().optional(),
  points: z.number().nonnegative(),
  outcomeId: z.string().optional(),
  correctValue: z.number().optional(),
  tolerance: z.number().optional(),
});

export const QuestionOptionSchema = z.object({
  id: nonEmpty,
  questionId: nonEmpty,
  text: nonEmpty,
  imageUrl: z.string().optional(),
  isCorrect: z.boolean().optional(),
  correctRank: z.number().int().positive().optional(),
  archetypeId: z.string().optional(),
});

export const ArchetypeSchema = z.object({
  id: nonEmpty,
  courseId: nonEmpty,
  name: nonEmpty,
  description: z.string(),
  order: z.number().int().nonnegative(),
});

export const EnrollmentSchema = z.object({
  userId: nonEmpty,
  courseId: nonEmpty,
  enrolledAt: isoDate,
});

export const ModuleProgressSchema = z.object({
  userId: nonEmpty,
  moduleId: nonEmpty,
  completed: z.boolean(),
  completedAt: isoDate.optional(),
});

export const AttemptSchema = z.object({
  id: nonEmpty,
  userId: nonEmpty,
  evaluationId: nonEmpty,
  startedAt: isoDate,
  submittedAt: isoDate.optional(),
  score: z.number().min(0).max(100).optional(),
  status: z.enum(["in_progress", "submitted"]),
});

export const AnswerSchema = z.object({
  id: nonEmpty,
  attemptId: nonEmpty,
  questionId: nonEmpty,
  selectedOptionIds: z.array(z.string()).optional(),
  openText: z.string().optional(),
  scaleValue: z.number().optional(),
  rankingOrder: z.array(z.string()).optional(),
  pointsAwarded: z.number().optional(),
  isCorrect: z.boolean().optional(),
});

export const OutcomeScoreSchema = z.object({
  attemptId: nonEmpty,
  outcomeId: nonEmpty,
  expected: z.number(),
  achieved: z.number(),
});

export const MessageSchema = z.object({
  id: nonEmpty,
  fromUserId: nonEmpty,
  toUserId: nonEmpty,
  courseId: z.string().optional(),
  body: nonEmpty,
  createdAt: isoDate,
  read: z.boolean(),
});

export const CommunityPostSchema = z.object({
  id: nonEmpty,
  authorId: nonEmpty,
  body: nonEmpty,
  category: z.enum(["preguntas", "hallazgos", "retos", "celebraciones"]).optional(),
  createdAt: isoDate,
});

export const CommunityReplySchema = z.object({
  id: nonEmpty,
  postId: nonEmpty,
  authorId: nonEmpty,
  body: nonEmpty,
  createdAt: isoDate,
});

export const MoodValueSchema = z.enum([
  "feliz",
  "enojada",
  "triste",
  "entusiasmada",
  "indiferente",
  "sorprendida",
  "aburrida",
  "abrumada",
  "pensativa",
  "enternecida",
  "divertida",
  "en-desacuerdo",
  "preocupada",
  "asustada",
  "frustrada",
  "cansada",
]);

export const MoodEntrySchema = z.object({
  userId: nonEmpty,
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dayKey debe ser YYYY-MM-DD"),
  mood: MoodValueSchema,
  comment: z.string().optional(),
  createdAt: isoDate,
});

export const CertificateSchema = z.object({
  code: nonEmpty,
  userId: nonEmpty,
  courseId: nonEmpty,
  studentName: nonEmpty,
  courseTitle: nonEmpty,
  courseDescription: z.string(),
  teacherName: nonEmpty,
  durationMin: z.number().nonnegative(),
  issuedAt: isoDate,
});
