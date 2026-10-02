/**
 * Intentos calificados en el servidor (Seguridad, Fase 1 · SEC-01/SEC-04).
 *
 * Estas funciones solo corren donde se puede confiar en el repositorio: en
 * las rutas /api/attempts/* (con la service role) y en MockRepository (tests).
 * El navegador nunca califica ni escribe intentos: manda lo que respondió y
 * recibe la nota.
 *
 * Reglas que hace cumplir el servidor, no la pantalla:
 * - Hay que tener intentos disponibles (mismo `canSubmitAttempt` de siempre).
 * - El intento es de quien llama y sigue abierto.
 * - Quiz cronometrado: cada pregunta se responde una sola vez (no hay vuelta
 *   atrás) y dentro de su tiempo, medido contra la hora del servidor.
 */

import type { Repository } from "@/lib/data/repository";
import type { Answer, AnswerInput, Attempt, AttemptResult, Question, QuestionOption } from "@/lib/domain/types";
import { gradeAttempt } from "@/lib/logic/grading";
import { isTimedEvaluation, QUESTION_SECONDS } from "@/lib/logic/timedQuiz";
import { canSubmitAttempt } from "./evaluation";

/** Margen por latencia de red y reloj: se suma una vez al tope acumulado. */
export const ANSWER_GRACE_SECONDS = 15;
const MAX_OPEN_TEXT = 5000;

/** Error con el código HTTP que debe devolver la ruta. */
export class AttemptError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function loadDetail(repo: Repository, evaluationId: string) {
  const detail = await repo.getEvaluationDetail(evaluationId);
  if (!detail) throw new AttemptError("La evaluación no existe.", 404);
  return detail;
}

async function ownOpenAttempt(repo: Repository, userId: string, attemptId: string): Promise<Attempt> {
  const attempt = await repo.getAttempt(attemptId);
  if (!attempt || attempt.userId !== userId) throw new AttemptError("El intento no existe.", 404);
  return attempt;
}

/**
 * Se queda solo con lo que tiene sentido para el tipo de pregunta y con ids
 * de opciones que existen: lo que llega del navegador no se guarda tal cual.
 */
export function sanitizeAnswer(question: Question, options: QuestionOption[], input: AnswerInput): AnswerInput {
  const optionIds = new Set(options.map((o) => o.id));
  switch (question.type) {
    case "single":
    case "multiple": {
      const ids = [...new Set((input.selectedOptionIds ?? []).filter((id) => optionIds.has(id)))];
      return { selectedOptionIds: question.type === "single" ? ids.slice(0, 1) : ids };
    }
    case "open":
      return { openText: typeof input.openText === "string" ? input.openText.slice(0, MAX_OPEN_TEXT) : undefined };
    case "scale": {
      const v = Number(input.scaleValue);
      return { scaleValue: Number.isFinite(v) ? Math.min(10, Math.max(1, Math.round(v))) : undefined };
    }
    case "ranking": {
      const ids = [...new Set((input.rankingOrder ?? []).filter((id) => optionIds.has(id)))];
      return { rankingOrder: ids };
    }
  }
}

/** Abre un intento cronometrado con la hora del servidor. */
export async function beginAttempt(
  repo: Repository,
  userId: string,
  evaluationId: string,
  now: Date = new Date(),
): Promise<Attempt> {
  const nowIso = now.toISOString();
  if (!(await canSubmitAttempt(repo, userId, evaluationId, nowIso))) {
    throw new AttemptError("Ya no tienes intentos disponibles para esta evaluación.", 409);
  }
  const attempt: Attempt = {
    id: `att-${evaluationId}-${crypto.randomUUID()}`,
    userId,
    evaluationId,
    startedAt: nowIso,
    status: "in_progress",
  };
  await repo.startAttempt(attempt);
  return attempt;
}

/** Guarda la respuesta a una pregunta de un intento abierto. */
export async function recordAttemptAnswer(
  repo: Repository,
  userId: string,
  attemptId: string,
  questionId: string,
  input: AnswerInput,
  now: Date = new Date(),
): Promise<void> {
  const attempt = await ownOpenAttempt(repo, userId, attemptId);
  if (attempt.status !== "in_progress") throw new AttemptError("Este intento ya terminó.", 409);

  const detail = await loadDetail(repo, attempt.evaluationId);
  const index = detail.questions.findIndex((q) => q.id === questionId);
  if (index < 0) throw new AttemptError("La pregunta no es de esta evaluación.", 400);

  if (isTimedEvaluation(detail.evaluation)) {
    // Tope acumulado: la pregunta i (0-based) no puede llegar después de
    // (i + 1) × 45 s desde que empezó el intento, más un margen.
    const elapsed = (now.getTime() - new Date(attempt.startedAt).getTime()) / 1000;
    if (elapsed > (index + 1) * QUESTION_SECONDS + ANSWER_GRACE_SECONDS) {
      throw new AttemptError("Se acabó el tiempo de esta pregunta.", 409);
    }
  }

  const saved = await repo.listAnswers(attemptId);
  if (saved.some((a) => a.questionId === questionId)) {
    throw new AttemptError("Esta pregunta ya fue respondida.", 409);
  }

  const question = detail.questions[index];
  const clean = sanitizeAnswer(question, detail.optionsByQuestion[question.id] ?? [], input);
  await repo.saveAttemptAnswer({ id: `${attemptId}-${questionId}`, attemptId, questionId, ...clean });
}

/**
 * Califica y cierra un intento abierto con lo que se guardó. Idempotente: si
 * ya estaba cerrado, devuelve la nota guardada.
 */
export async function completeAttempt(
  repo: Repository,
  userId: string,
  attemptId: string,
  now: Date = new Date(),
): Promise<AttemptResult> {
  const attempt = await ownOpenAttempt(repo, userId, attemptId);
  if (attempt.status === "submitted") {
    return {
      attemptId,
      score: attempt.score ?? 0,
      outcomeScores: await repo.listOutcomeScores(attemptId),
    };
  }

  const [detail, answers] = await Promise.all([
    loadDetail(repo, attempt.evaluationId),
    repo.listAnswers(attemptId),
  ]);
  const graded = gradeAttempt({
    attemptId,
    questions: detail.questions,
    optionsByQuestion: detail.optionsByQuestion,
    outcomes: detail.outcomes,
    answers,
  });
  await repo.finishAttempt(
    { ...attempt, status: "submitted", submittedAt: now.toISOString(), score: graded.score },
    graded.gradedAnswers,
    graded.outcomeScores,
  );
  return { attemptId, score: graded.score, outcomeScores: graded.outcomeScores };
}

/**
 * Evaluación sin cronómetro (diagnósticos, onboarding de intereses): se
 * envía completa, se califica y se guarda de una vez.
 */
export async function submitAttemptAnswers(
  repo: Repository,
  userId: string,
  evaluationId: string,
  inputs: Record<string, AnswerInput>,
  now: Date = new Date(),
): Promise<AttemptResult> {
  const nowIso = now.toISOString();
  const detail = await loadDetail(repo, evaluationId);
  if (isTimedEvaluation(detail.evaluation)) {
    throw new AttemptError("Este quiz es cronometrado: se responde pregunta por pregunta.", 400);
  }
  if (!(await canSubmitAttempt(repo, userId, evaluationId, nowIso))) {
    throw new AttemptError("Ya no tienes intentos disponibles para esta evaluación.", 409);
  }

  const attemptId = `att-${evaluationId}-${crypto.randomUUID()}`;
  const answers: Answer[] = detail.questions
    .filter((q) => inputs[q.id])
    .map((q) => ({
      id: `${attemptId}-${q.id}`,
      attemptId,
      questionId: q.id,
      ...sanitizeAnswer(q, detail.optionsByQuestion[q.id] ?? [], inputs[q.id]),
    }));
  const graded = gradeAttempt({
    attemptId,
    questions: detail.questions,
    optionsByQuestion: detail.optionsByQuestion,
    outcomes: detail.outcomes,
    answers,
  });
  await repo.submitAttempt(
    {
      id: attemptId,
      userId,
      evaluationId,
      startedAt: nowIso,
      submittedAt: nowIso,
      score: graded.score,
      status: "submitted",
    },
    graded.gradedAnswers,
    graded.outcomeScores,
  );
  return { attemptId, score: graded.score, outcomeScores: graded.outcomeScores };
}
