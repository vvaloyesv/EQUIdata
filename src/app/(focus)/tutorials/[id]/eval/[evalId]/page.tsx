"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildEvaluationView, canSubmitAttempt } from "@/lib/student/evaluation";
import { gradeAttempt } from "@/lib/logic/grading";
import type { Answer, OutcomeScore } from "@/lib/domain/types";
import type { DraftAnswer } from "@/components/student/QuestionField";
import { QuestionField, isQuestionAnswered } from "@/components/student/QuestionField";
import { ResultsView } from "@/components/student/ResultsView";
import { FocusTopBar } from "@/components/student/FocusTopBar";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SubmitResult {
  score: number;
  outcomeScores: OutcomeScore[];
}

/**
 * Quiz de tutorial (spec M9): mismo motor de Evaluation/Question que los
 * quizzes de curso, pero recortado — sin certificado, sin línea base
 * pre/post, sin ramas de diagnóstico final/onboarding de intereses (no
 * aplican a un tutorial suelto).
 */
export default function TutorialEvalPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: tutorialId, evalId } = use(params);
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unansweredIds, setUnansweredIds] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);

  const { data: vm, loading } = useAsync(
    () =>
      user
        ? buildEvaluationView(getRepository(), user.id, evalId, new Date().toISOString())
        : Promise.resolve(null),
    [user?.id, evalId, reloadKey],
  );

  useEffect(() => {
    setAnswers({});
    setResult(null);
    setStarted(false);
    setUnansweredIds(new Set());
  }, [evalId]);

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { evaluation, questions, optionsByQuestion, gate } = vm;

  async function submit() {
    if (!user) return;

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
      setReloadKey((k) => k + 1);
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
      outcomes: [],
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

    setResult({ score: graded.score, outcomeScores: graded.outcomeScores });
    setSubmitting(false);
    setReloadKey((k) => k + 1);
  }

  const passed =
    evaluation.passingScore !== undefined &&
    (result?.score ?? 0) >= evaluation.passingScore;

  function retry() {
    setResult(null);
    setAnswers({});
    setUnansweredIds(new Set());
    setStarted(true);
  }

  return (
    <div>
      <FocusTopBar
        backHref={`/tutorials/${tutorialId}`}
        backLabel="Volver al tutorial"
        crumbs={[evaluation.title]}
      />

      <div className="mx-auto max-w-3xl px-8 py-8">
        <Badge tone="lavender" className="mb-2">
          Quiz
        </Badge>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">
          {evaluation.title}
        </h1>

        <div className="mt-6">
          {result ? (
            <div className="space-y-6">
              <ResultsView
                evaluation={evaluation}
                score={result.score}
                outcomeScores={result.outcomeScores}
                outcomes={[]}
                passed={passed}
                extraMessage={
                  passed
                    ? "¡Buen trabajo!"
                    : "Puedes revisar el tutorial y volver a intentarlo."
                }
              />
              <div className="flex gap-3">
                {!gate.passed && gate.canAttempt && (
                  <Button onClick={retry}>
                    Hacer el intento {gate.usedAttempts + 1} de{" "}
                    {evaluation.maxAttempts}
                  </Button>
                )}
                <Link href={`/tutorials/${tutorialId}`}>
                  <Button variant="secondary">Volver al tutorial</Button>
                </Link>
              </div>
            </div>
          ) : gate.passed ? (
            <Card bordered>
              <Label>Ya completado</Label>
              <p className="mt-2 text-[var(--color-navy)]">
                Ya aprobaste este quiz con {gate.bestScore}%.
              </p>
            </Card>
          ) : !gate.canAttempt ? (
            <Card bordered>
              <Label>Sin intentos disponibles</Label>
              <p className="mt-2 text-[var(--color-navy)]">{gate.reasonLabel}</p>
              {gate.bestScore !== undefined && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Mejor nota hasta ahora: {gate.bestScore}%
                </p>
              )}
            </Card>
          ) : !started ? (
            <Card bordered>
              <Label>Antes de empezar</Label>
              <p className="mt-2 text-[var(--color-navy)]">
                Este quiz tiene <strong>{questions.length}</strong>{" "}
                {questions.length === 1 ? "pregunta" : "preguntas"} y tienes{" "}
                <strong>{evaluation.maxAttempts}</strong> intentos.
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {gate.usedAttempts > 0
                  ? `Este sería el intento ${gate.usedAttempts + 1} de ${evaluation.maxAttempts}.`
                  : "Todas las preguntas son obligatorias."}
                {evaluation.passingScore !== undefined &&
                  ` Aprueba con ${evaluation.passingScore}%.`}
              </p>
              <Button onClick={() => setStarted(true)} className="mt-4">
                Empezar
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
                <span>
                  Intento {gate.usedAttempts + 1} de {evaluation.maxAttempts}
                </span>
                {evaluation.passingScore !== undefined && (
                  <span>Aprueba con {evaluation.passingScore}%</span>
                )}
              </div>

              {questions.map((q, i) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  options={optionsByQuestion[q.id] ?? []}
                  index={i}
                  value={answers[q.id] ?? {}}
                  onChange={(v) => {
                    setAnswers((a) => ({ ...a, [q.id]: v }));
                    setUnansweredIds((prev) => {
                      if (!prev.has(q.id)) return prev;
                      const next = new Set(prev);
                      next.delete(q.id);
                      return next;
                    });
                  }}
                  error={unansweredIds.has(q.id)}
                />
              ))}

              {unansweredIds.size > 0 && (
                <p className="text-center text-sm text-[var(--color-coral)]">
                  Responde todas las preguntas antes de enviar.
                </p>
              )}

              <Button onClick={submit} disabled={submitting} className="w-full">
                {submitting ? "Enviando…" : "Enviar respuestas"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
