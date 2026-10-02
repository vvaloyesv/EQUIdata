import { useEffect, useState } from "react";
import { getRepository } from "@/lib/data";
import { getBaselineByOutcomeCode, type EvaluationVM } from "@/lib/student/evaluation";
import { getCourseCompletion } from "@/lib/student/course";
import { computeArchetypeResult } from "@/lib/logic/archetype";
import { isCertificateEligible } from "@/lib/logic/certificate";
import { bestScore } from "@/lib/logic/attempts";
import type { Answer, AnswerInput, OutcomeScore, User } from "@/lib/domain/types";
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
  const [submitError, setSubmitError] = useState<string>();

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
    const { evaluation, questions, optionsByQuestion, archetypes } = vm;

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
    setSubmitError(undefined);

    setSubmitting(true);
    const repo = getRepository();

    // Seguridad, Fase 1: el servidor valida los intentos, califica y guarda.
    // El navegador solo manda lo que se respondió (no conoce las claves).
    const inputs: Record<string, AnswerInput> = {};
    for (const q of questions) inputs[q.id] = answers[q.id] ?? {};
    let graded: { score: number; outcomeScores: OutcomeScore[] };
    try {
      graded = await repo.submitAnswers(user.id, evaluation.id, inputs);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo enviar. Intenta de nuevo.");
      setSubmitting(false);
      refresh();
      return;
    }

    let baseline: Record<string, number> | undefined;
    let certificateEligible: boolean | undefined;
    let certificateReason: string | undefined;

    if (evaluation.kind === "diagnostic_final") {
      const [baselineByCode, priorAttempts, completion] = await Promise.all([
        getBaselineByOutcomeCode(repo, user.id, courseId),
        repo.listAttempts(user.id, evaluation.id),
        getCourseCompletion(repo, user.id, courseId),
      ]);
      baseline = baselineByCode;
      const best = Math.max(graded.score, bestScore(priorAttempts) ?? 0);
      const { total, completed } = completion;
      const elig = isCertificateEligible({
        finalBestScore: best,
        finalPassingScore: evaluation.passingScore ?? 100,
        totalModules: total,
        completedModules: completed,
      });
      certificateEligible = elig.eligible;
      certificateReason = elig.reasonLabel;
    }

    // El arquetipo sale de qué opciones eligió (no hay respuestas correctas).
    const chosen: Answer[] = questions.map((q) => ({
      id: q.id,
      attemptId: "",
      questionId: q.id,
      ...(answers[q.id] ?? {}),
    }));
    const archetypeResult = isInterest
      ? computeArchetypeResult(chosen, optionsByQuestion, archetypes)
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
    submitError,
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
