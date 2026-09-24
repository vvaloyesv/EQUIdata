/**
 * Ensambla el view-model del constructor de quiz/diagnóstico del profesor:
 * la evaluación, sus resultados de aprendizaje y sus preguntas con opciones.
 */

import type { Repository } from "@/lib/data/repository";
import type {
  Archetype,
  Course,
  Evaluation,
  LearningOutcome,
  Question,
  QuestionOption,
} from "@/lib/domain/types";

export interface TeacherQuizVM {
  course: Course;
  evaluation: Evaluation;
  outcomes: LearningOutcome[];
  /** Arquetipos del curso — solo relevantes cuando evaluation.kind === 'interest_onboarding'. */
  archetypes: Archetype[];
  questions: Question[];
  optionsByQuestion: Record<string, QuestionOption[]>;
}

export async function buildTeacherQuizView(
  repo: Repository,
  evaluationId: string,
): Promise<TeacherQuizVM> {
  // M10 · F4: evaluación completa en una consulta, luego curso y arquetipos
  // en paralelo (antes, una consulta por pregunta).
  const detail = await repo.getEvaluationDetail(evaluationId);
  if (!detail) throw new Error(`Evaluación no encontrada: ${evaluationId}`);
  const { evaluation, questions, optionsByQuestion, outcomes } = detail;
  if (!evaluation.courseId) {
    throw new Error(`Evaluación sin curso (¿es un quiz de tutorial?): ${evaluationId}`);
  }

  const [course, archetypes] = await Promise.all([
    repo.getCourse(evaluation.courseId),
    repo.listArchetypes(evaluation.courseId),
  ]);
  if (!course) throw new Error(`Curso no encontrado: ${evaluation.courseId}`);

  return { course, evaluation, outcomes, archetypes, questions, optionsByQuestion };
}
