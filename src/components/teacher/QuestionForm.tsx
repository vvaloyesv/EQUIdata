"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { Archetype, LearningOutcome, QuestionType } from "@/lib/domain/types";

export interface QuestionSubmitData {
  type: QuestionType;
  text: string;
  points: number;
  outcomeId?: string;
  correctValue?: number;
  tolerance?: number;
  options: Array<{
    text: string;
    isCorrect?: boolean;
    correctRank?: number;
    archetypeId?: string;
  }>;
}

const TYPE_LABEL: Record<QuestionType, string> = {
  single: "Opción única",
  multiple: "Opción múltiple",
  open: "Respuesta abierta",
  scale: "Escala 1–10",
  ranking: "Ranking",
};

/** En modo intereses solo tienen sentido preguntas de opción(es) — cada una suma a un arquetipo. */
const INTEREST_TYPE_LABEL: Partial<Record<QuestionType, string>> = {
  single: "Opción única",
  multiple: "Opción múltiple",
};

export function QuestionForm({
  outcomes,
  archetypes,
  noOutcomes,
  onSubmit,
  onCancel,
}: {
  outcomes: LearningOutcome[];
  /** Si viene, el formulario opera en modo "intereses": sin RA, cada opción se asocia a un arquetipo. */
  archetypes?: Archetype[];
  /** Quiz de tutorial: sin RA, pero por lo demás igual a una pregunta normal (tipos, puntos, correcta). */
  noOutcomes?: boolean;
  onSubmit: (data: QuestionSubmitData) => void;
  onCancel: () => void;
}) {
  const isInterestMode = archetypes !== undefined;
  const skipOutcome = isInterestMode || noOutcomes;
  const typeLabels = isInterestMode ? INTEREST_TYPE_LABEL : TYPE_LABEL;
  const [type, setType] = useState<QuestionType>("single");
  const [options, setOptions] = useState<
    Array<{ text: string; isCorrect: boolean; correctRank?: number; archetypeId?: string }>
  >([
    { text: "", isCorrect: false, archetypeId: archetypes?.[0]?.id },
    { text: "", isCorrect: false, archetypeId: archetypes?.[0]?.id },
  ]);

  function updateOption(i: number, patch: Partial<(typeof options)[number]>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function setSingleCorrect(i: number) {
    setOptions((prev) => prev.map((o, idx) => ({ ...o, isCorrect: idx === i })));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const needsOptions = type === "single" || type === "multiple" || type === "ranking";

    onSubmit({
      type,
      text: String(form.get("text") ?? ""),
      points: isInterestMode || type === "open" ? 0 : Number(form.get("points") ?? 1),
      outcomeId: skipOutcome ? undefined : String(form.get("outcomeId") ?? ""),
      correctValue:
        !isInterestMode && type === "scale" && form.get("correctValue")
          ? Number(form.get("correctValue"))
          : undefined,
      tolerance:
        !isInterestMode && type === "scale" && form.get("tolerance")
          ? Number(form.get("tolerance"))
          : undefined,
      options: needsOptions
        ? options
            .filter((o) => o.text.trim())
            .map((o, i) => ({
              text: o.text,
              isCorrect: !isInterestMode && type !== "ranking" ? o.isCorrect : undefined,
              correctRank: !isInterestMode && type === "ranking" ? i + 1 : undefined,
              archetypeId: isInterestMode ? o.archetypeId : undefined,
            }))
        : [],
    });
  }

  if (!skipOutcome && outcomes.length === 0) {
    return (
      <div className="rounded-[var(--radius-token)] border border-dashed border-[var(--color-divider)] p-4 text-sm text-[var(--color-muted)]">
        Define al menos un resultado de aprendizaje antes de crear preguntas.
      </div>
    );
  }
  if (isInterestMode && archetypes.length === 0) {
    return (
      <div className="rounded-[var(--radius-token)] border border-dashed border-[var(--color-divider)] p-4 text-sm text-[var(--color-muted)]">
        Define al menos un arquetipo antes de crear preguntas.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-[var(--color-canvas)] p-4"
    >
      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Tipo"
          options={Object.values(typeLabels)}
          onChange={(e) => {
            const entry = Object.entries(typeLabels).find(([, v]) => v === e.target.value);
            if (entry) setType(entry[0] as QuestionType);
          }}
        />
        {!skipOutcome && (
          <div className="flex flex-col gap-1.5">
            <label>
              <Label>Resultado de aprendizaje</Label>
            </label>
            <select
              name="outcomeId"
              required
              defaultValue=""
              className="rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
            >
              <option value="" disabled>
                Selecciona un RA
              </option>
              {outcomes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} — {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {!isInterestMode && type !== "open" && (
          <Input name="points" label="Puntos" type="number" min={0} defaultValue={1} required />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label>
          <Label>Enunciado</Label>
        </label>
        <textarea
          name="text"
          rows={2}
          required
          className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] focus-ring"
        />
      </div>

      {(type === "single" || type === "multiple" || type === "ranking") && (
        <div className="space-y-2">
          <Label>
            Opciones
            {type === "ranking" && " (en el orden correcto)"}
            {isInterestMode && " (cada una suma a un arquetipo)"}
          </Label>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              {!isInterestMode && type !== "ranking" && (
                <input
                  type={type === "single" ? "radio" : "checkbox"}
                  name="correct"
                  checked={o.isCorrect}
                  onChange={() =>
                    type === "single" ? setSingleCorrect(i) : updateOption(i, { isCorrect: !o.isCorrect })
                  }
                  className="accent-[var(--color-navy)]"
                />
              )}
              {!isInterestMode && type === "ranking" && (
                <span className="w-5 shrink-0 text-center text-xs text-[var(--color-hint)]">
                  {i + 1}
                </span>
              )}
              <input
                value={o.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                placeholder={`Opción ${i + 1}`}
                className="flex-1 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3 py-2 text-sm focus-ring"
              />
              {isInterestMode && (
                <select
                  value={o.archetypeId ?? ""}
                  onChange={(e) => updateOption(i, { archetypeId: e.target.value })}
                  className="shrink-0 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-2.5 py-2 text-xs text-[var(--color-navy)] focus-ring"
                >
                  {archetypes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-[var(--color-hint)] hover:text-[var(--color-coral)]"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setOptions((prev) => [
                ...prev,
                { text: "", isCorrect: false, archetypeId: archetypes?.[0]?.id },
              ])
            }
            className="flex items-center gap-1 text-xs text-[var(--color-lavender-text)] hover:underline"
          >
            <Plus size={13} /> Agregar opción
          </button>
        </div>
      )}

      {!isInterestMode && type === "scale" && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="correctValue"
            label="Valor esperado (opcional)"
            type="number"
            min={1}
            max={10}
          />
          <Input name="tolerance" label="Tolerancia (opcional)" type="number" min={0} max={9} />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="!px-4 !py-2 text-sm">
          Agregar pregunta
        </Button>
        <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
