import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import type { AttemptGate } from "@/lib/logic/attempts";
import type { Evaluation } from "@/lib/domain/types";

const KIND_LABEL: Record<string, string> = {
  diagnostic_initial: "Diagnóstico inicial",
  quiz: "Quiz",
  diagnostic_final: "Diagnóstico final",
  interest_onboarding: "Onboarding de intereses",
};

/** Pantalla previa a empezar: cuántas preguntas, cuántos intentos y con qué % se aprueba. */
export function EvalIntroCard({
  evaluation,
  questionCount,
  gate,
  onStart,
}: {
  evaluation: Evaluation;
  questionCount: number;
  gate: AttemptGate;
  onStart: () => void;
}) {
  return (
    <Card bordered>
      <Label>Antes de empezar</Label>
      <p className="mt-2 text-[var(--color-navy)]">
        Este {KIND_LABEL[evaluation.kind].toLowerCase()} tiene{" "}
        <strong>{questionCount}</strong> {questionCount === 1 ? "pregunta" : "preguntas"}{" "}
        y tienes <strong>{evaluation.maxAttempts}</strong> intentos
        {evaluation.kind === "diagnostic_final" &&
          ` (con ${evaluation.waitHours}h de espera entre tandas)`}
        .
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {gate.usedAttempts > 0
          ? `Este sería el intento ${gate.usedAttempts + 1} de ${evaluation.maxAttempts}.`
          : "Todas las preguntas son obligatorias."}
        {evaluation.passingScore !== undefined && ` Aprueba con ${evaluation.passingScore}%.`}
      </p>
      <Button onClick={onStart} className="mt-4">
        Empezar
      </Button>
    </Card>
  );
}

export { KIND_LABEL };
