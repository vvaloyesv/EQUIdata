/**
 * Ensambla los view-models del panel del profesor para Tutoriales: la lista
 * de tutoriales con su quiz (si tienen uno), y el constructor de ese quiz.
 * El quiz de tutorial es simple (spec M9): preguntas + % de aprobación +
 * intentos, sin Resultados de Aprendizaje — un tutorial es contenido suelto.
 */

import type { Repository } from "@/lib/data/repository";
import type { Evaluation, Module, Question, QuestionOption } from "@/lib/domain/types";

export interface TeacherTutorialVM {
  tutorial: Module;
  quiz?: Evaluation;
}

export async function buildTeacherTutorialsView(
  repo: Repository,
): Promise<TeacherTutorialVM[]> {
  // M10 · F4: tutoriales y sus quizzes en dos consultas paralelas (antes, una por tutorial).
  const [tutorials, quizzes] = await Promise.all([
    repo.listTutorials(),
    repo.listTutorialQuizzes(),
  ]);
  return tutorials.map((tutorial) => ({
    tutorial,
    quiz: quizzes.find((q) => q.tutorialModuleId === tutorial.id),
  }));
}

export interface TeacherTutorialQuizVM {
  tutorial: Module;
  evaluation: Evaluation;
  questions: Question[];
  optionsByQuestion: Record<string, QuestionOption[]>;
}

export async function buildTeacherTutorialQuizView(
  repo: Repository,
  evaluationId: string,
): Promise<TeacherTutorialQuizVM> {
  const [detail, tutorials] = await Promise.all([
    repo.getEvaluationDetail(evaluationId),
    // La lista (sin HTML) basta: el constructor solo muestra el título del tutorial.
    repo.listTutorials(),
  ]);
  if (!detail) throw new Error(`Evaluación no encontrada: ${evaluationId}`);
  const { evaluation, questions, optionsByQuestion } = detail;
  if (!evaluation.tutorialModuleId) {
    throw new Error(`Evaluación sin tutorial asociado: ${evaluationId}`);
  }

  const tutorial = tutorials.find((t) => t.id === evaluation.tutorialModuleId);
  if (!tutorial) {
    throw new Error(`Tutorial no encontrado: ${evaluation.tutorialModuleId}`);
  }

  return { tutorial, evaluation, questions, optionsByQuestion };
}
