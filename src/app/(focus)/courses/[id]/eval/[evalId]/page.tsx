"use client";

import { use, useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  TimedQuiz,
  useFinalizeAbandonedAttempts,
  type TimedQuizResult,
} from "@/components/student/TimedQuiz";
import { isTimedEvaluation } from "@/lib/logic/timedQuiz";
import { useAuth } from "@/context/AuthContext";
import { useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildEvaluationView } from "@/lib/student/evaluation";
import { FocusTopBar } from "@/components/student/FocusTopBar";
import { Badge } from "@/components/ui/Badge";
import { useEvalSubmission } from "./useEvalSubmission";
import { EvalResultPanel } from "./EvalResultPanel";
import { EvalGateNotice } from "./EvalGateNotice";
import { EvalIntroCard, KIND_LABEL } from "./EvalIntroCard";
import { EvalQuestionsForm } from "./EvalQuestionsForm";

export default function EvalPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: courseId, evalId } = use(params);
  const { user } = useAuth();
  const invalidate = useRefresh();
  const refresh = useCallback(() => void invalidate(), [invalidate]);
  const userId = user?.id ?? "";
  const [timedRunning, setTimedRunning] = useState(false);
  const [timedResult, setTimedResult] = useState<TimedQuizResult | null>(null);
  const [timedRun, setTimedRun] = useState(0);

  const { data: vm, loading } = useRepoQuery(
    ["evaluation-view", userId, evalId],
    () => buildEvaluationView(getRepository(), userId, evalId, new Date().toISOString()),
    { enabled: !!user },
  );

  const { data: course } = useRepoQuery(["course", courseId], () =>
    getRepository().getCourse(courseId),
  );

  const submission = useEvalSubmission(vm, user, courseId, refresh);
  const timed = vm ? isTimedEvaluation(vm.evaluation) : false;
  const { closedAbandoned } = useFinalizeAbandonedAttempts(timed ? vm : null, {
    paused: timedRunning,
    onDone: refresh,
  });

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { evaluation, questions, optionsByQuestion, outcomes, archetypes, gate, modulesGate } = vm;

  return (
    <div>
      <FocusTopBar
        backHref={`/courses/${courseId}`}
        backLabel="Volver al curso"
        crumbs={[course?.title ?? "", evaluation.title].filter(Boolean)}
      />

      <div className="mx-auto max-w-3xl px-8 py-8">
        <Badge tone="lavender" className="mb-2">
          {KIND_LABEL[evaluation.kind]}
        </Badge>
        <h1 className="font-display text-3xl text-[var(--color-navy)]">{evaluation.title}</h1>

        {closedAbandoned && !timedRunning && (
          <Card bordered className="mt-6 border-[var(--color-lavender)] text-sm text-[var(--color-navy)]">
            Tu intento anterior quedó sin terminar y se registró con las respuestas que
            alcanzaste a dar. Si necesitas otro intento, pídeselo a tu profesora.
          </Card>
        )}

        <div className="mt-6">
          {timed ? (
            timedResult ? (
              <EvalResultPanel
                evaluation={evaluation}
                courseId={courseId}
                isInterest={false}
                archetypes={archetypes}
                outcomes={outcomes}
                result={timedResult}
                gate={gate}
                passed={
                  evaluation.passingScore !== undefined &&
                  timedResult.score >= evaluation.passingScore
                }
                onRetry={() => {
                  setTimedResult(null);
                  setTimedRun((k) => k + 1);
                }}
              />
            ) : timedRunning || (modulesGate.ok && !gate.passed && gate.canAttempt) ? (
              <TimedQuiz
                key={timedRun}
                vm={vm}
                userId={userId}
                onRunningChange={setTimedRunning}
                onFinished={(result) => {
                  setTimedResult(result);
                  refresh();
                }}
              />
            ) : (
              <EvalGateNotice
                courseId={courseId}
                modulesGate={modulesGate}
                gate={gate}
                isInterest={false}
                priorArchetypeResult={vm.priorArchetypeResult}
                archetypes={archetypes}
              />
            )
          ) : submission.result ? (
            <EvalResultPanel
              evaluation={evaluation}
              courseId={courseId}
              isInterest={submission.isInterest}
              archetypes={archetypes}
              outcomes={outcomes}
              result={submission.result}
              gate={gate}
              passed={submission.passed}
              onRetry={submission.retry}
            />
          ) : !modulesGate.ok || gate.passed || !gate.canAttempt ? (
            <EvalGateNotice
              courseId={courseId}
              modulesGate={modulesGate}
              gate={gate}
              isInterest={submission.isInterest}
              priorArchetypeResult={vm.priorArchetypeResult}
              archetypes={archetypes}
            />
          ) : !submission.started ? (
            <EvalIntroCard
              evaluation={evaluation}
              questionCount={questions.length}
              gate={gate}
              onStart={() => submission.setStarted(true)}
            />
          ) : (
            <EvalQuestionsForm
              evaluation={evaluation}
              questions={questions}
              optionsByQuestion={optionsByQuestion}
              gate={gate}
              answers={submission.answers}
              unansweredIds={submission.unansweredIds}
              submitting={submission.submitting}
              onAnswerChange={submission.onAnswerChange}
              onSubmit={submission.submit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
