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
  const evaluation = await repo.getEvaluation(evaluationId);
  if (!evaluation) throw new Error(`Evaluación no encontrada: ${evaluationId}`);
  if (!evaluation.courseId) {
    throw new Error(`Evaluación sin curso (¿es un quiz de tutorial?): ${evaluationId}`);
  }

  const course = await repo.getCourse(evaluation.courseId);
  if (!course) throw new Error(`Curso no encontrado: ${evaluation.courseId}`);

  const outcomes = await repo.listOutcomes(evaluationId);
  const archetypes = await repo.listArchetypes(evaluation.courseId);
  const questions = await repo.listQuestions(evaluationId);

  const optionsByQuestion: Record<string, QuestionOption[]> = {};
  for (const q of questions) {
    optionsByQuestion[q.id] = await repo.listOptions(q.id);
  }

  return { course, evaluation, outcomes, archetypes, questions, optionsByQuestion };
}
