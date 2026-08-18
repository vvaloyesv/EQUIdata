import Link from "next/link";
import { Award } from "lucide-react";
import { ResultsView } from "@/components/student/ResultsView";
import { ArchetypeResultView } from "@/components/student/ArchetypeResultView";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Archetype, Evaluation, LearningOutcome } from "@/lib/domain/types";
import type { AttemptGate } from "@/lib/logic/attempts";
import type { SubmitResult } from "./useEvalSubmission";

/** Resultado del intento recién enviado: nota/arquetipo, CTA de certificado y acciones siguientes. */
export function EvalResultPanel({
  evaluation,
  courseId,
  isInterest,
  archetypes,
  outcomes,
  result,
  gate,
  passed,
  onRetry,
}: {
  evaluation: Evaluation;
  courseId: string;
  isInterest: boolean;
  archetypes: Archetype[];
  outcomes: LearningOutcome[];
  result: SubmitResult;
  gate: AttemptGate;
  passed: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      {isInterest ? (
        result.archetypeId && (
          <ArchetypeResultView
            archetype={archetypes.find((a) => a.id === result.archetypeId)!}
          />
        )
      ) : (
        <ResultsView
          evaluation={evaluation}
          score={result.score}
          outcomeScores={result.outcomeScores}
          outcomes={outcomes}
          baseline={result.baseline}
          passed={passed}
          extraMessage={
            evaluation.kind === "quiz" && passed
              ? "Se desbloqueó la siguiente sesión."
              : evaluation.kind === "quiz" && !passed
                ? "Puedes seguir avanzando; el profesor puede reabrir intentos si lo necesitas."
                : evaluation.kind === "diagnostic_final"
                  ? result.certificateEligible
                    ? "Tu certificado ya está disponible."
                    : result.certificateReason
                  : undefined
          }
        />
      )}
      {evaluation.kind === "diagnostic_final" && result.certificateEligible && (
        <Card bordered className="flex items-center justify-between gap-3 border-[var(--color-lime)]">
          <div className="flex items-center gap-3">
            <Award size={20} className="text-[var(--color-lime-text)]" />
            <p className="text-sm text-[var(--color-navy)]">
              ¡Felicitaciones! Ya puedes acceder a tu certificado.
            </p>
          </div>
          <Link href={`/courses/${courseId}/certificate`}>
            <Button variant="secondary">Ver certificado</Button>
          </Link>
        </Card>
      )}
      <div className="flex gap-3">
        {!gate.passed && gate.canAttempt && (
          <Button onClick={onRetry}>
            Hacer el intento {gate.usedAttempts + 1} de {evaluation.maxAttempts}
          </Button>
        )}
        <Link href={`/courses/${courseId}`}>
          <Button variant="secondary">Volver al curso</Button>
        </Link>
      </div>
    </div>
  );
}
