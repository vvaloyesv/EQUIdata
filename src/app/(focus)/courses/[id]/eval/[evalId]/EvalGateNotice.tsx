import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArchetypeResultView } from "@/components/student/ArchetypeResultView";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ScoreStrip } from "@/components/ui/Charts";
import { formatDayMonth } from "@/lib/dates";
import type { Archetype } from "@/lib/domain/types";
import type { AttemptGate } from "@/lib/logic/attempts";
import type { ArchetypeResult } from "@/lib/logic/archetype";

const attemptDate = formatDayMonth;

/**
 * Estados de solo-lectura antes de poder rendir: módulos previos pendientes,
 * evaluación ya aprobada, o sin intentos disponibles (con el resultado de
 * arquetipo previo si aplica). Ninguno es un callejón sin salida: todos
 * muestran el historial y a dónde ir (auditoría E6).
 */
export function EvalGateNotice({
  courseId,
  modulesGate,
  gate,
  isInterest,
  priorArchetypeResult,
  archetypes,
  history = [],
  passingScore,
}: {
  courseId: string;
  modulesGate: { ok: boolean; reasonLabel?: string };
  gate: AttemptGate;
  isInterest: boolean;
  priorArchetypeResult?: ArchetypeResult;
  archetypes: Archetype[];
  history?: { id: string; score: number; submittedAt: string }[];
  passingScore?: number;
}) {
  const backToCourse = (
    <Link href={`/courses/${courseId}`}>
      <Button variant="secondary">
        <ArrowLeft size={15} /> Repasar en el curso
      </Button>
    </Link>
  );

  if (!modulesGate.ok) {
    return (
      <Card bordered>
        <Label>Módulos pendientes</Label>
        <p className="mt-2 text-[var(--color-navy)]">{modulesGate.reasonLabel}</p>
        <div className="mt-4">{backToCourse}</div>
      </Card>
    );
  }

  if (!gate.canAttempt && !gate.passed && isInterest && priorArchetypeResult) {
    return (
      <ArchetypeResultView
        archetype={archetypes.find((a) => a.id === priorArchetypeResult.archetypeId)!}
      />
    );
  }

  const exhausted = !gate.passed;
  return (
    <Card bordered>
      <Label className={gate.passed ? "text-[var(--color-lime-text)]" : undefined}>
        {gate.passed ? "Aprobada" : "Sin intentos disponibles"} · {gate.usedAttempts}{" "}
        {gate.usedAttempts === 1 ? "intento" : "intentos"}
        {gate.bestScore !== undefined ? ` · mejor ${gate.bestScore}%` : ""}
      </Label>
      <p className="mt-2 text-[var(--color-navy)]">
        {gate.passed
          ? `Ya aprobaste esta evaluación con ${gate.bestScore}%.`
          : gate.availableAtIso
            ? gate.reasonLabel
            : "Usaste todos tus intentos. Si necesitas otro, pídele a tu profesora que te lo reabra."}
      </p>

      {history.length > 0 && (
        <>
          <ScoreStrip
            className="mt-6"
            threshold={passingScore}
            points={history.map((h, i) => ({ id: h.id, value: h.score, label: `Intento ${i + 1}` }))}
          />
          <ul className="mt-4 divide-y divide-[var(--color-divider)] border-t border-[var(--color-divider)]">
            {history.map((h, i) => (
              <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--color-muted)]">
                  Intento {i + 1} · {attemptDate(h.submittedAt)}
                </span>
                <span className="font-display tabular-nums text-[var(--color-navy)]">{h.score}%</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {exhausted && <div className="mt-5">{backToCourse}</div>}
    </Card>
  );
}
