import Link from "next/link";
import { ArchetypeResultView } from "@/components/student/ArchetypeResultView";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import type { Archetype } from "@/lib/domain/types";
import type { AttemptGate } from "@/lib/logic/attempts";
import type { ArchetypeResult } from "@/lib/logic/archetype";

/**
 * Estados de solo-lectura antes de poder rendir: módulos previos pendientes,
 * evaluación ya aprobada, o sin intentos disponibles (con el resultado de
 * arquetipo previo si aplica). Ninguno de estos muestra el formulario.
 */
export function EvalGateNotice({
  courseId,
  modulesGate,
  gate,
  isInterest,
  priorArchetypeResult,
  archetypes,
}: {
  courseId: string;
  modulesGate: { ok: boolean; reasonLabel?: string };
  gate: AttemptGate;
  isInterest: boolean;
  priorArchetypeResult?: ArchetypeResult;
  archetypes: Archetype[];
}) {
  if (!modulesGate.ok) {
    return (
      <Card bordered>
        <Label>Módulos pendientes</Label>
        <p className="mt-2 text-[var(--color-navy)]">{modulesGate.reasonLabel}</p>
        <Link href={`/courses/${courseId}`}>
          <Button variant="secondary" className="mt-4">
            Volver al curso
          </Button>
        </Link>
      </Card>
    );
  }

  if (gate.passed) {
    return (
      <Card bordered>
        <Label>Ya completada</Label>
        <p className="mt-2 text-[var(--color-navy)]">
          Ya aprobaste esta evaluación con {gate.bestScore}%.
        </p>
      </Card>
    );
  }

  if (!gate.canAttempt && isInterest && priorArchetypeResult) {
    return (
      <ArchetypeResultView
        archetype={archetypes.find((a) => a.id === priorArchetypeResult.archetypeId)!}
      />
    );
  }

  return (
    <Card bordered>
      <Label>Sin intentos disponibles</Label>
      <p className="mt-2 text-[var(--color-navy)]">{gate.reasonLabel}</p>
      {gate.bestScore !== undefined && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Mejor nota hasta ahora: {gate.bestScore}%
        </p>
      )}
    </Card>
  );
}
