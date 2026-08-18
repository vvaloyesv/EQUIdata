import { Button } from "@/components/ui/Button";
import { QuestionField } from "@/components/student/QuestionField";
import type { DraftAnswer } from "@/components/student/QuestionField";
import type { Evaluation, Question, QuestionOption } from "@/lib/domain/types";
import type { AttemptGate } from "@/lib/logic/attempts";

/** Formulario del intento en curso: contador de intento + preguntas + envío. */
export function EvalQuestionsForm({
  evaluation,
  questions,
  optionsByQuestion,
  gate,
  answers,
  unansweredIds,
  submitting,
  onAnswerChange,
  onSubmit,
}: {
  evaluation: Evaluation;
  questions: Question[];
  optionsByQuestion: Record<string, QuestionOption[]>;
  gate: AttemptGate;
  answers: Record<string, DraftAnswer>;
  unansweredIds: Set<string>;
  submitting: boolean;
  onAnswerChange: (questionId: string, value: DraftAnswer) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          Intento {gate.usedAttempts + 1} de {evaluation.maxAttempts}
          {evaluation.kind === "diagnostic_final" && " (por tanda)"}
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
          onChange={(v) => onAnswerChange(q.id, v)}
          error={unansweredIds.has(q.id)}
        />
      ))}

      {unansweredIds.size > 0 && (
        <p className="text-center text-sm text-[var(--color-coral)]">
          Responde todas las preguntas antes de enviar.
        </p>
      )}

      <Button onClick={onSubmit} disabled={submitting} className="w-full">
        {submitting ? "Enviando…" : "Enviar respuestas"}
      </Button>
    </div>
  );
}
