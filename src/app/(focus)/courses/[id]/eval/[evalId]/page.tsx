"use client";

import { use, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
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
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => setReloadKey((k) => k + 1);

  const { data: vm, loading } = useAsync(
    () =>
      user
        ? buildEvaluationView(getRepository(), user.id, evalId, new Date().toISOString())
        : Promise.resolve(null),
    [user?.id, evalId, reloadKey],
  );

  const { data: course } = useAsync(
    () => getRepository().getCourse(courseId),
    [courseId],
  );

  const submission = useEvalSubmission(vm, user, courseId, refresh);

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

        <div className="mt-6">
          {submission.result ? (
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
