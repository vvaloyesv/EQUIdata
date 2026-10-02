import { CheckCircle2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ScoreStrip, TargetBar } from "@/components/ui/Charts";
import type { Evaluation, LearningOutcome, OutcomeScore } from "@/lib/domain/types";

/**
 * Resultado de una evaluación (spec §5.4.1 y auditoría §11.4): la nota sobre
 * un eje 0–100 % con la línea de aprobación, y cada resultado de aprendizaje
 * como "logrado vs. esperado", con pre/post en el diagnóstico final.
 */
export function ResultsView({
  evaluation,
  score,
  outcomeScores,
  outcomes,
  baseline,
  passed,
  extraMessage,
  previousScores = [],
}: {
  evaluation: Evaluation;
  score: number;
  outcomeScores: OutcomeScore[];
  outcomes: LearningOutcome[];
  /** Línea base por código de RA (solo diagnóstico final). */
  baseline?: Record<string, number>;
  passed?: boolean;
  extraMessage?: React.ReactNode;
  /** Notas de intentos anteriores, para verlas junto a la de ahora. */
  previousScores?: number[];
}) {
  const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
  const hasPassing = evaluation.passingScore !== undefined;

  return (
    <div className="space-y-6">
      <Card bordered>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Label>
              Tu resultado{hasPassing ? ` · aprueba con ${evaluation.passingScore}%` : ""}
            </Label>
            <div className="mt-2 font-display text-6xl tabular-nums leading-none text-[var(--color-navy)]">
              {score}
              <span className="text-3xl">%</span>
            </div>
          </div>
          {hasPassing &&
            (passed ? (
              <Badge tone="lime">
                <CheckCircle2 size={13} /> Aprobado
              </Badge>
            ) : (
              <Badge tone="coral">Aún no aprobado</Badge>
            ))}
        </div>
        <ScoreStrip
          className="mt-6"
          threshold={evaluation.passingScore}
          points={[
            ...previousScores.map((v, i) => ({ id: `prev-${i}`, value: v, label: `Intento ${i + 1}` })),
            { id: "now", value: score, label: "Este intento" },
          ]}
        />
        {extraMessage && <p className="mt-4 text-sm text-[var(--color-muted)]">{extraMessage}</p>}
      </Card>

      {outcomeScores.length > 0 && (
        <Card bordered>
          <Label>Resultados por dimensión · logrado vs. esperado</Label>
          <div className="mt-5 space-y-6">
            {outcomeScores.map((os) => {
              const outcome = outcomeById.get(os.outcomeId);
              const met = os.achieved >= os.expected;
              const before = baseline?.[outcome?.code ?? ""];
              return (
                <div key={os.outcomeId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--color-navy)]">
                      {outcome?.code ? `${outcome.code} · ` : ""}
                      {outcome?.name ?? os.outcomeId}
                    </p>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--color-navy)]">
                      {os.achieved}% <span className="text-[var(--color-muted)]">/ {os.expected}%</span>
                    </span>
                  </div>
                  <TargetBar achieved={os.achieved} expected={os.expected} className="mt-2.5" />
                  <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    {before !== undefined && (
                      <>
                        <TrendingUp size={13} className="text-[var(--color-lavender-text)]" />
                        Antes {before}% → ahora {os.achieved}% ·{" "}
                      </>
                    )}
                    {met ? "Superaste el nivel esperado." : "Por reforzar: repasa esta dimensión."}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
