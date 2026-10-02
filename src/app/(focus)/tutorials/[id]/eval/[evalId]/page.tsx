"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildEvaluationView } from "@/lib/student/evaluation";
import { ResultsView } from "@/components/student/ResultsView";
import { FocusTopBar } from "@/components/student/FocusTopBar";
import {
  TimedQuiz,
  useFinalizeAbandonedAttempts,
  type TimedQuizResult,
} from "@/components/student/TimedQuiz";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreStrip } from "@/components/ui/Charts";

/**
 * Quiz de tutorial (spec M9): mismo motor de Evaluation/Question que los
 * quizzes de curso, recortado — sin certificado, sin línea base pre/post,
 * sin resultados por RA. Desde el 24/09/2026 se rinde cronometrado (una
 * pregunta a la vez, 45 s cada una), igual que los quizzes de sesión.
 */
export default function TutorialEvalPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: tutorialId, evalId } = use(params);
  const { user } = useAuth();
  const invalidate = useRefresh();
  const refresh = useCallback(() => void invalidate(), [invalidate]);
  const userId = user?.id ?? "";
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TimedQuizResult | null>(null);
  const [run, setRun] = useState(0);

  const { data: vm, loading } = useRepoQuery(
    ["evaluation-view", userId, evalId],
    () => buildEvaluationView(getRepository(), userId, evalId, new Date().toISOString()),
    { enabled: !!user },
  );
  const { closedAbandoned } = useFinalizeAbandonedAttempts(vm, { paused: running, onDone: refresh });

  useEffect(() => {
    setResult(null);
    setRun((k) => k + 1);
  }, [evalId]);

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { evaluation, gate } = vm;
  const passed =
    !!result && evaluation.passingScore !== undefined && result.score >= evaluation.passingScore;

  return (
    <div>
      <FocusTopBar
        backHref={`/tutorials/${tutorialId}`}
        backLabel="Volver al tutorial"
        crumbs={[evaluation.title]}
      />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <Badge tone="lavender" className="mb-2">
          Quiz
        </Badge>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">{evaluation.title}</h1>

        {closedAbandoned && !running && (
          <Card bordered className="mt-6 border-[var(--color-lavender)] text-sm text-[var(--color-navy)]">
            Tu intento anterior quedó sin terminar y se registró con las respuestas que
            alcanzaste a dar. Si necesitas otro intento, pídeselo a tu profesora.
          </Card>
        )}

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
                  passed ? "¡Buen trabajo!" : "Puedes revisar el tutorial y volver a intentarlo."
                }
              />
              <div className="flex gap-3">
                {!gate.passed && gate.canAttempt && (
                  <Button
                    onClick={() => {
                      setResult(null);
                      setRun((k) => k + 1);
                    }}
                  >
                    Hacer el intento {gate.usedAttempts + 1} de {gate.attemptCap ?? evaluation.maxAttempts}
                  </Button>
                )}
                <Link href={`/tutorials/${tutorialId}`}>
                  <Button variant="secondary">Volver al tutorial</Button>
                </Link>
              </div>
            </div>
          ) : running || (!gate.passed && gate.canAttempt) ? (
            <TimedQuiz
              key={run}
              vm={vm}
              userId={userId}
              onRunningChange={setRunning}
              onFinished={(r) => {
                setResult(r);
                refresh();
              }}
            />
          ) : gate.passed ? (
            <Card bordered>
              <Label>Ya completado</Label>
              <p className="mt-2 text-[var(--color-navy)]">
                Ya aprobaste este quiz con {gate.bestScore}%.
              </p>
            </Card>
          ) : (
            <Card bordered>
              <Label>
                Sin intentos disponibles · {gate.usedAttempts}{" "}
                {gate.usedAttempts === 1 ? "intento" : "intentos"}
                {gate.bestScore !== undefined ? ` · mejor ${gate.bestScore}%` : ""}
              </Label>
              <p className="mt-2 text-[var(--color-navy)]">
                Usaste todos tus intentos. Si necesitas otro, pídele a tu profesora que te lo reabra.
              </p>
              {vm.history.length > 0 && (
                <ScoreStrip
                  className="mt-6"
                  threshold={evaluation.passingScore}
                  points={vm.history.map((h, i) => ({ id: h.id, value: h.score, label: `Intento ${i + 1}` }))}
                />
              )}
              <Link href={`/tutorials/${tutorialId}`} className="mt-5 inline-block">
                <Button variant="secondary">Repasar el tutorial</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
