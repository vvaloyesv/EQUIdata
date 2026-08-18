import { CheckCircle2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import type { Evaluation, LearningOutcome, OutcomeScore } from "@/lib/domain/types";

/**
 * Retroalimentación por resultado de aprendizaje (spec §5.4.1): esperado vs.
 * logrado por dimensión, con pre/post cuando es el diagnóstico final.
 */
export function ResultsView({
  evaluation,
  score,
  outcomeScores,
  outcomes,
  baseline,
  passed,
  extraMessage,
}: {
  evaluation: Evaluation;
  score: number;
  outcomeScores: OutcomeScore[];
  outcomes: LearningOutcome[];
  /** Línea base por código de RA (solo diagnóstico final). */
  baseline?: Record<string, number>;
  passed?: boolean;
  extraMessage?: React.ReactNode;
}) {
  const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
  const hasPassing = evaluation.passingScore !== undefined;

  return (
    <div className="space-y-6">
      <Card dark className="text-center">
        <Label className="!text-white/60">Tu resultado</Label>
        <div className="mt-2 font-display text-5xl text-white">{score}%</div>
        {hasPassing && (
          <div className="mt-3">
            {passed ? (
              <Badge tone="lime">
                <CheckCircle2 size={13} /> Aprobado
              </Badge>
            ) : (
              <Badge tone="coral">No aprobado aún</Badge>
            )}
          </div>
        )}
        {extraMessage && (
          <p className="mt-3 text-sm text-white/70">{extraMessage}</p>
        )}
      </Card>

      {outcomeScores.length > 0 && (
        <Card bordered>
          <Label>Resultados por dimensión</Label>
          <div className="mt-4 space-y-5">
            {outcomeScores.map((os) => {
              const outcome = outcomeById.get(os.outcomeId);
              const superado = os.achieved >= os.expected;
              const before = baseline?.[outcome?.code ?? ""];
              return (
                <div key={os.outcomeId}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-navy)]">
                      {outcome?.name ?? os.outcomeId}
                    </p>
                    <Badge tone={superado ? "lime" : "coral"}>
                      {superado ? "Superado" : "Oportunidad de mejora"}
                    </Badge>
                  </div>

                  {before !== undefined ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-muted)]">
                      <TrendingUp size={14} className="text-[var(--color-lavender-text)]" />
                      <span>
                        {before}% → <span className="font-medium text-[var(--color-navy)]">{os.achieved}%</span>
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Esperábamos {os.expected}%, estás en {os.achieved}%
                    </p>
                  )}

                  <div className="relative mt-2 h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-divider)]">
                    <div
                      className="absolute h-full rounded-[var(--radius-pill)] bg-[var(--color-lime)]"
                      style={{ width: `${Math.min(100, os.achieved)}%` }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 bg-[var(--color-navy)]"
                      style={{ left: `${Math.min(100, os.expected)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
