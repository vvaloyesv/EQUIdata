/**
 * Calificación de un intento.
 *
 * Autocalifica: opción única, opción múltiple, ranking y escala (con valor
 * esperado + tolerancia). La respuesta abierta NO puntúa: queda registrada sin
 * respuesta modelo (decisión de spec §5.4). La escala sin valor esperado es
 * autorreporte: no puntúa.
 *
 * Devuelve las respuestas calificadas, la nota global (0–100) y el desglose por
 * resultado de aprendizaje (RA), que alimenta la retro por dimensión y el pre/post.
 */

import type {
  Answer,
  LearningOutcome,
  OutcomeScore,
  Question,
  QuestionOption,
} from "@/lib/domain/types";

export interface GradeInput {
  attemptId: string;
  questions: Question[];
  optionsByQuestion: Record<string, QuestionOption[]>;
  outcomes: LearningOutcome[];
  /** Respuestas crudas (sin points_awarded aún). */
  answers: Answer[];
}

export interface GradeResult {
  gradedAnswers: Answer[];
  /** Nota global 0–100 sobre las preguntas que puntúan. */
  score: number;
  outcomeScores: OutcomeScore[];
}

/** ¿Una pregunta aporta puntos? (abierta y escala-sin-valor no). */
function questionScores(q: Question): boolean {
  if (q.type === "open") return false;
  if (q.type === "scale" && q.correctValue === undefined) return false;
  return true;
}

function gradeOne(
  q: Question,
  a: Answer | undefined,
  options: QuestionOption[],
): { pointsAwarded: number; isCorrect: boolean } {
  if (!a) return { pointsAwarded: 0, isCorrect: false };

  switch (q.type) {
    case "single":
    case "multiple": {
      const correct = new Set(
        options.filter((o) => o.isCorrect).map((o) => o.id),
      );
      const chosen = new Set(a.selectedOptionIds ?? []);
      const exact =
        correct.size === chosen.size &&
        [...correct].every((id) => chosen.has(id));
      return { pointsAwarded: exact ? q.points : 0, isCorrect: exact };
    }
    case "ranking": {
      const order = a.rankingOrder ?? [];
      const ok = options.every((o) => {
        if (o.correctRank === undefined) return true;
        return order[o.correctRank - 1] === o.id;
      });
      const complete = order.length === options.length;
      const correct = ok && complete;
      return { pointsAwarded: correct ? q.points : 0, isCorrect: correct };
    }
    case "scale": {
      if (q.correctValue === undefined) {
        // Autorreporte: no puntúa.
        return { pointsAwarded: 0, isCorrect: false };
      }
      const tol = q.tolerance ?? 0;
      const v = a.scaleValue ?? Number.NaN;
      const near = Math.abs(v - q.correctValue) <= tol;
      return { pointsAwarded: near ? q.points : 0, isCorrect: near };
    }
    case "open":
      return { pointsAwarded: 0, isCorrect: false };
  }
}

export function gradeAttempt(input: GradeInput): GradeResult {
  const { questions, optionsByQuestion, outcomes, answers, attemptId } = input;
  const answerByQ = new Map(answers.map((a) => [a.questionId, a]));

  const gradedAnswers: Answer[] = [];
  let earned = 0;
  let possible = 0;

  // Acumuladores por RA
  const raEarned: Record<string, number> = {};
  const raPossible: Record<string, number> = {};

  for (const q of questions) {
    const a = answerByQ.get(q.id);
    const opts = optionsByQuestion[q.id] ?? [];
    const { pointsAwarded, isCorrect } = gradeOne(q, a, opts);

    if (a) {
      gradedAnswers.push({ ...a, pointsAwarded, isCorrect });
    }

    if (questionScores(q)) {
      earned += pointsAwarded;
      possible += q.points;
      if (q.outcomeId) {
        raEarned[q.outcomeId] = (raEarned[q.outcomeId] ?? 0) + pointsAwarded;
        raPossible[q.outcomeId] = (raPossible[q.outcomeId] ?? 0) + q.points;
      }
    }
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  const outcomeScores: OutcomeScore[] = outcomes
    .filter((o) => raPossible[o.id] !== undefined)
    .map((o) => ({
      attemptId,
      outcomeId: o.id,
      expected: o.expectedLevel,
      achieved:
        raPossible[o.id] > 0
          ? Math.round((raEarned[o.id] / raPossible[o.id]) * 100)
          : 0,
    }));

  return { gradedAnswers, score, outcomeScores };
}
