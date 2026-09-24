/**
 * Ensambla el view-model de calificaciones de una evaluación: mejor intento
 * por estudiante, desglose por RA, la respuesta exacta a cada pregunta (para
 * el CSV y la revisión de respuestas abiertas), y estado de intentos (para
 * el botón de reabrir — spec §5.11).
 *
 * M10 · F4: dos tandas de lecturas en bloque, sin importar cuántos
 * estudiantes o preguntas haya (antes: una consulta por pregunta y cinco
 * por estudiante).
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
import { gradesToCsv, type GradeRow } from "@/lib/logic/grades-csv";

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
  const [detail, enrollments, allAttempts, bonusByUser] = await Promise.all([
    repo.getEvaluationDetail(evaluationId),
    repo.listEnrollmentsByCourse(courseId),
    repo.listAttemptsByEvaluation(evaluationId),
    repo.listBonusAttemptsByEvaluation(evaluationId),
  ]);
  if (!detail) throw new Error(`Evaluación no encontrada: ${evaluationId}`);
  const { evaluation, questions, optionsByQuestion, outcomes } = detail;

  const outcomeCodeById = new Map(outcomes.map((o) => [o.id, o.code]));
  const openQuestions = questions.filter((q) => q.type === "open");
  const questionLabels = questions.map((q, i) => `P${i + 1}: ${q.text}`);

  const bestAttemptOf = (userId: string) =>
    allAttempts
      .filter((a) => a.userId === userId && a.status === "submitted" && a.score !== undefined)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const bestIds = enrollments.map((e) => bestAttemptOf(e.userId)?.id).filter((id): id is string => !!id);

  const [students, bestScores, bestAnswers] = await Promise.all([
    repo.listUsersByIds(enrollments.map((e) => e.userId)),
    repo.listOutcomeScoresByAttempts(bestIds),
    repo.listAnswersByAttempts(bestIds),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s]));

  const rows: StudentGradeRow[] = [];
  for (const enrollment of enrollments) {
    const student = studentById.get(enrollment.userId);
    if (!student) continue;

    const attempts = allAttempts.filter((a) => a.userId === enrollment.userId);
    const submitted = attempts.filter((a) => a.status === "submitted");
    const best = bestAttemptOf(enrollment.userId);

    const outcomeAchieved: Record<string, number> = {};
    const openAnswers: Array<{ question: string; answer: string }> = [];
    let questionAnswers: string[] = questions.map(() => "");

    if (best) {
      for (const s of bestScores.filter((x) => x.attemptId === best.id)) {
        const code = outcomeCodeById.get(s.outcomeId);
        if (code) outcomeAchieved[code] = s.achieved;
      }

      const answers = bestAnswers.filter((a) => a.attemptId === best.id);
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

    const bonus = bonusByUser[enrollment.userId] ?? 0;
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

/**
 * CSV de calificaciones de una evaluación (nota, RA y respuesta por
 * pregunta). Lo arma el servidor (`/api/teacher/grades/export`), no la
 * pantalla. Lleva BOM UTF-8 para que Excel muestre bien tildes y eñes.
 */
export function gradesCsvFromView(vm: GradesVM): { csv: string; filename: string } {
  const outcomeCodes = vm.outcomes.map((o) => o.code);
  const outcomeExpected = Object.fromEntries(vm.outcomes.map((o) => [o.code, o.expectedLevel]));
  const rows: GradeRow[] = vm.rows.map((r) => ({
    studentName: r.student.displayName,
    email: r.student.email,
    evaluationTitle: vm.evaluation.title,
    score: r.bestScore ?? null,
    outcomeAchieved: r.outcomeAchieved,
    outcomeExpected,
    questionAnswers: r.questionAnswers,
  }));
  const safeTitle = vm.evaluation.title.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "") || "calificaciones";
  return {
    csv: "﻿" + gradesToCsv(rows, outcomeCodes, vm.questionLabels),
    filename: `${safeTitle}.csv`,
  };
}
