import { useEffect, useState } from "react";
import { getRepository } from "@/lib/data";
import {
  canSubmitAttempt,
  getBaselineByOutcomeCode,
  type EvaluationVM,
} from "@/lib/student/evaluation";
import { getCourseCompletion } from "@/lib/student/course";
import { gradeAttempt } from "@/lib/logic/grading";
import { computeArchetypeResult } from "@/lib/logic/archetype";
import { isCertificateEligible } from "@/lib/logic/certificate";
import { bestScore } from "@/lib/logic/attempts";
import type { Answer, OutcomeScore, User } from "@/lib/domain/types";
import type { DraftAnswer } from "@/components/student/QuestionField";
import { isQuestionAnswered } from "@/components/student/QuestionField";

export interface SubmitResult {
  score: number;
  outcomeScores: OutcomeScore[];
  baseline?: Record<string, number>;
  certificateEligible?: boolean;
  certificateReason?: string;
  archetypeId?: string;
}

/**
 * Estado y lógica de envío de un intento de evaluación de curso: preguntas
 * respondidas, calificación, línea base pre/post, elegibilidad de
 * certificado y arquetipo de intereses. Separado de la página para que el
 * componente solo se ocupe de renderizar.
 */
export function useEvalSubmission(
  vm: EvaluationVM | null,
  user: User | null,
  courseId: string,
  refresh: () => void,
) {
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unansweredIds, setUnansweredIds] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);

  const isInterest = vm?.evaluation.kind === "interest_onboarding";

  useEffect(() => {
    setAnswers({});
    setResult(null);
    setStarted(false);
    setUnansweredIds(new Set());
  }, [vm?.evaluation.id]);

  function onAnswerChange(questionId: string, value: DraftAnswer) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    setUnansweredIds((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }

  async function submit() {
    if (!user || !vm) return;
    const { evaluation, questions, optionsByQuestion, outcomes, archetypes } = vm;

    // Todas las preguntas son obligatorias — bloquear el envío y resaltar
    // las que falten, sin dejar pasar respuestas vacías.
    const missing = questions.filter(
      (q) => !isQuestionAnswered(q, optionsByQuestion[q.id] ?? [], answers[q.id] ?? {}),
    );
    if (missing.length > 0) {
      setUnansweredIds(new Set(missing.map((q) => q.id)));
      return;
    }
    setUnansweredIds(new Set());

    setSubmitting(true);
    const repo = getRepository();

    // Revalida el gate justo antes de escribir: la UI ya oculta el
    // formulario cuando no se puede intentar, pero esta es la barrera real —
    // protege contra un envío disparado desde una pestaña vieja o DevTools.
    const stillAllowed = await canSubmitAttempt(
      repo,
      user.id,
      evaluation.id,
      new Date().toISOString(),
    );
    if (!stillAllowed) {
      setSubmitting(false);
      refresh();
      return;
    }

    const attemptId = `att-${evaluation.id}-${crypto.randomUUID()}`;

    const rawAnswers: Answer[] = questions.map((q) => {
      const d = answers[q.id] ?? {};
      return {
        id: `${attemptId}-${q.id}`,
        attemptId,
        questionId: q.id,
        selectedOptionIds: d.selectedOptionIds,
        openText: d.openText,
        scaleValue: d.scaleValue,
        rankingOrder: d.rankingOrder,
      };
    });

    const graded = gradeAttempt({
      attemptId,
      questions,
      optionsByQuestion,
      outcomes,
      answers: rawAnswers,
    });

    const nowIso = new Date().toISOString();
    await repo.createAttempt({
      id: attemptId,
      userId: user.id,
      evaluationId: evaluation.id,
      startedAt: nowIso,
      submittedAt: nowIso,
      score: graded.score,
      status: "submitted",
    });
    await repo.saveAnswers(graded.gradedAnswers);
    await repo.saveOutcomeScores(graded.outcomeScores);

    let baseline: Record<string, number> | undefined;
    let certificateEligible: boolean | undefined;
    let certificateReason: string | undefined;

    if (evaluation.kind === "diagnostic_final") {
      baseline = await getBaselineByOutcomeCode(repo, user.id, courseId);
      const priorAttempts = await repo.listAttempts(user.id, evaluation.id);
      const best = Math.max(graded.score, bestScore(priorAttempts) ?? 0);
      const { total, completed } = await getCourseCompletion(repo, user.id, courseId);
      const elig = isCertificateEligible({
        finalBestScore: best,
        finalPassingScore: evaluation.passingScore ?? 100,
        totalModules: total,
        completedModules: completed,
      });
      certificateEligible = elig.eligible;
      certificateReason = elig.reasonLabel;
    }

    const archetypeResult = isInterest
      ? computeArchetypeResult(graded.gradedAnswers, optionsByQuestion, archetypes)
      : null;

    setResult({
      score: graded.score,
      outcomeScores: graded.outcomeScores,
      baseline,
      certificateEligible,
      certificateReason,
      archetypeId: archetypeResult?.archetypeId,
    });
    setSubmitting(false);
    refresh();
  }

  /** Al reintentar, se salta la intro y va directo al formulario del siguiente intento. */
  function retry() {
    setResult(null);
    setAnswers({});
    setUnansweredIds(new Set());
    setStarted(true);
  }

  const passed =
    !!vm &&
    vm.evaluation.passingScore !== undefined &&
    (result?.score ?? 0) >= vm.evaluation.passingScore;

  return {
    answers,
    result,
    submitting,
    unansweredIds,
    started,
    isInterest,
    passed,
    setStarted,
    onAnswerChange,
    submit,
    retry,
  };
}
