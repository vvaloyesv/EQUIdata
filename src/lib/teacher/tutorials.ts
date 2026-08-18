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
  const tutorials = await repo.listTutorials();
  const out: TeacherTutorialVM[] = [];
  for (const tutorial of tutorials) {
    const quiz = await repo.getTutorialQuiz(tutorial.id);
    out.push({ tutorial, quiz });
  }
  return out;
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
  const evaluation = await repo.getEvaluation(evaluationId);
  if (!evaluation) throw new Error(`Evaluación no encontrada: ${evaluationId}`);
  if (!evaluation.tutorialModuleId) {
    throw new Error(`Evaluación sin tutorial asociado: ${evaluationId}`);
  }

  const tutorial = await repo.getModule(evaluation.tutorialModuleId);
  if (!tutorial) {
    throw new Error(`Tutorial no encontrado: ${evaluation.tutorialModuleId}`);
  }

  const questions = await repo.listQuestions(evaluationId);
  const optionsByQuestion: Record<string, QuestionOption[]> = {};
  for (const q of questions) {
    optionsByQuestion[q.id] = await repo.listOptions(q.id);
  }

  return { tutorial, evaluation, questions, optionsByQuestion };
}
