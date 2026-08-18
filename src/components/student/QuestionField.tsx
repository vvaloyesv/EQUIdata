"use client";

import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Label";
import type { Question, QuestionOption } from "@/lib/domain/types";

export interface DraftAnswer {
  selectedOptionIds?: string[];
  openText?: string;
  scaleValue?: number;
  rankingOrder?: string[];
}

/**
 * Todas las preguntas son obligatorias (spec §5.4). Determina si una
 * respuesta cuenta como "contestada" según el tipo de pregunta.
 */
export function isQuestionAnswered(
  question: Question,
  options: QuestionOption[],
  value: DraftAnswer,
): boolean {
  switch (question.type) {
    case "single":
      return (value.selectedOptionIds?.length ?? 0) === 1;
    case "multiple":
      return (value.selectedOptionIds?.length ?? 0) > 0;
    case "open":
      return (value.openText ?? "").trim().length > 0;
    case "scale":
      return value.scaleValue !== undefined;
    case "ranking":
      return (value.rankingOrder?.length ?? 0) === options.length;
  }
}

/** Un campo de pregunta, según su tipo (spec §5.4: 4 tipos soportados). */
export function QuestionField({
  question,
  options,
  index,
  value,
  onChange,
  error,
}: {
  question: Question;
  options: QuestionOption[];
  index: number;
  value: DraftAnswer;
  onChange: (v: DraftAnswer) => void;
  /** true si se intentó enviar sin contestar esta pregunta. */
  error?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border bg-white p-5",
        error ? "border-[var(--color-coral)]" : "border-[var(--color-divider)]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Label>Pregunta {index + 1}</Label>
        {error && (
          <span className="text-xs font-medium text-[var(--color-coral)]">
            Responde esta pregunta
          </span>
        )}
      </div>
      <p className="mt-1.5 font-display text-base text-[var(--color-navy)]">
        {question.text}
      </p>

      <div className="mt-4">
        {question.type === "single" && (
          <div className="space-y-2">
            {options.map((o) => (
              <label
                key={o.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[var(--radius-token)] border px-3.5 py-2.5 text-sm transition-colors",
                  value.selectedOptionIds?.[0] === o.id
                    ? "border-[var(--color-navy)] bg-[var(--color-navy-tint)]"
                    : "border-[var(--color-divider)] hover:border-[var(--color-lavender)]",
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  className="accent-[var(--color-navy)]"
                  checked={value.selectedOptionIds?.[0] === o.id}
                  onChange={() => onChange({ selectedOptionIds: [o.id] })}
                />
                {o.text}
              </label>
            ))}
          </div>
        )}

        {question.type === "multiple" && (
          <div className="space-y-2">
            {options.map((o) => {
              const checked = value.selectedOptionIds?.includes(o.id) ?? false;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[var(--radius-token)] border px-3.5 py-2.5 text-sm transition-colors",
                    checked
                      ? "border-[var(--color-navy)] bg-[var(--color-navy-tint)]"
                      : "border-[var(--color-divider)] hover:border-[var(--color-lavender)]",
                  )}
                >
                  <input
                    type="checkbox"
                    className="accent-[var(--color-navy)]"
                    checked={checked}
                    onChange={(e) => {
                      const current = value.selectedOptionIds ?? [];
                      onChange({
                        selectedOptionIds: e.target.checked
                          ? [...current, o.id]
                          : current.filter((id) => id !== o.id),
                      });
                    }}
                  />
                  {o.text}
                </label>
              );
            })}
          </div>
        )}

        {question.type === "open" && (
          <textarea
            rows={4}
            className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-hint)] focus-ring"
            placeholder="Escribe tu respuesta…"
            value={value.openText ?? ""}
            onChange={(e) => onChange({ openText: e.target.value })}
          />
        )}

        {question.type === "scale" && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ scaleValue: n })}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-[var(--radius-token)] border text-sm font-medium transition-colors",
                  value.scaleValue === n
                    ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                    : "border-[var(--color-divider)] text-[var(--color-navy)] hover:border-[var(--color-lavender)]",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {question.type === "ranking" && (
          <div className="space-y-2">
            {options.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-token)] border border-[var(--color-divider)] px-3.5 py-2.5 text-sm"
              >
                <span>{o.text}</span>
                <select
                  className="rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-2 py-1 text-sm focus-ring"
                  value={
                    value.rankingOrder ? value.rankingOrder.indexOf(o.id) + 1 || "" : ""
                  }
                  onChange={(e) => {
                    const rank = Number(e.target.value);
                    const order = [...(value.rankingOrder ?? [])].filter(
                      (id) => id !== o.id,
                    );
                    while (order.length < rank - 1) order.push("");
                    order.splice(rank - 1, 0, o.id);
                    onChange({ rankingOrder: order.filter(Boolean) });
                  }}
                >
                  <option value="" disabled>
                    Puesto
                  </option>
                  {options.map((_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
