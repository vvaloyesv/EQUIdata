/**
 * Ensambla el view-model de calificaciones de una evaluación: mejor intento
 * por estudiante, desglose por RA, la respuesta exacta a cada pregunta (para
 * el CSV y la revisión de respuestas abiertas), y estado de intentos (para
 * el botón de reabrir — spec §5.11).
 */

import type { Repository } from "@/lib/data/repository";
import type {
  Answer,
  Evaluation,
  LearningOutcome,
  Question,
  QuestionOption,
  User,
} from "@/lib/domain/types";
import { attemptGate } from "@/lib/logic/attempts";

export interface StudentGradeRow {
  student: User;
  bestScore?: number;
  passed: boolean;
  outcomeAchieved: Record<string, number>; // por código de RA
  openAnswers: Array<{ question: string; answer: string }>;
  /** Respuesta formateada por pregunta, en el mismo orden que GradesVM.questionLabels. */
  questionAnswers: string[];
  usedAttempts: number;
  canReopen: boolean;
}

export interface GradesVM {
  evaluation: Evaluation;
  outcomes: LearningOutcome[];
  /** Encabezados legibles de cada pregunta, en orden — para las columnas del CSV. */
  questionLabels: string[];
  rows: StudentGradeRow[];
}

/** Convierte una respuesta cruda en texto legible, según el tipo de pregunta. */
function formatAnswer(
  question: Question,
  options: QuestionOption[],
  answer: Answer | undefined,
): string {
  if (!answer) return "";
  const optionText = (id: string) => options.find((o) => o.id === id)?.text ?? id;

  switch (question.type) {
    case "single":
    case "multiple":
      return (answer.selectedOptionIds ?? []).map(optionText).join("; ");
    case "open":
      return answer.openText ?? "";
    case "scale":
      return answer.scaleValue !== undefined ? String(answer.scaleValue) : "";
    case "ranking":
      return (answer.rankingOrder ?? []).map(optionText).join(" > ");
  }
}

export async function buildGradesView(
  repo: Repository,
  courseId: string,
  evaluationId: string,
  nowIso: string,
): Promise<GradesVM> {
  const evaluation = await repo.getEvaluation(evaluationId);
  if (!evaluation) throw new Error(`Evaluación no encontrada: ${evaluationId}`);

  const outcomes = await repo.listOutcomes(evaluationId);
  const outcomeCodeById = new Map(outcomes.map((o) => [o.id, o.code]));
  const questions = await repo.listQuestions(evaluationId);
  const openQuestions = questions.filter((q) => q.type === "open");

  const optionsByQuestion: Record<string, QuestionOption[]> = {};
  for (const q of questions) {
    optionsByQuestion[q.id] = await repo.listOptions(q.id);
  }
  const questionLabels = questions.map((q, i) => `P${i + 1}: ${q.text}`);

  const enrollments = await repo.listEnrollmentsByCourse(courseId);
  const rows: StudentGradeRow[] = [];

  for (const enrollment of enrollments) {
    const student = await repo.getUserById(enrollment.userId);
    if (!student) continue;

    const attempts = await repo.listAttempts(enrollment.userId, evaluationId);
    const submitted = attempts.filter((a) => a.status === "submitted");
    const best = submitted
      .filter((a) => a.score !== undefined)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

    const outcomeAchieved: Record<string, number> = {};
    const openAnswers: Array<{ question: string; answer: string }> = [];
    let questionAnswers: string[] = questions.map(() => "");

    if (best) {
      const scores = await repo.listOutcomeScores(best.id);
      for (const s of scores) {
        const code = outcomeCodeById.get(s.outcomeId);
        if (code) outcomeAchieved[code] = s.achieved;
      }

      const answers = await repo.listAnswers(best.id);
      questionAnswers = questions.map((q) =>
        formatAnswer(
          q,
          optionsByQuestion[q.id] ?? [],
          answers.find((a) => a.questionId === q.id),
        ),
      );

      for (const q of openQuestions) {
        const a = answers.find((ans) => ans.questionId === q.id);
        if (a?.openText) openAnswers.push({ question: q.text, answer: a.openText });
      }
    }

    const bonus = await repo.getBonusAttempts(enrollment.userId, evaluationId);
    const gate = attemptGate({ evaluation, attempts, nowIso, bonusAttempts: bonus });
    const passed =
      evaluation.passingScore !== undefined &&
      (best?.score ?? -1) >= evaluation.passingScore;

    rows.push({
      student,
      bestScore: best?.score,
      passed,
      outcomeAchieved,
      openAnswers,
      questionAnswers,
      usedAttempts: submitted.length,
      canReopen: !gate.canAttempt && !gate.passed,
    });
  }

  return { evaluation, outcomes, questionLabels, rows };
}
