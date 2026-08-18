"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { ChallengeDifficulty } from "@/lib/domain/types";

const DIFFICULTY_OPTIONS: ChallengeDifficulty[] = ["Básico", "Intermedio", "Avanzado"];

export function ChallengeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    title: string;
    description: string;
    difficulty: ChallengeDifficulty;
    contentHtml: string;
  }) => void;
  onCancel: () => void;
}) {
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit({
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      difficulty: String(form.get("difficulty") ?? "Básico") as ChallengeDifficulty,
      contentHtml: String(form.get("contentHtml") ?? ""),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-[var(--color-canvas)] p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Input name="title" label="Título" placeholder="Encuentra el outlier" required />
        <Select
          name="difficulty"
          label="Dificultad"
          options={DIFFICULTY_OPTIONS}
          defaultValue="Básico"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label>
          <Label>Descripción</Label>
        </label>
        <textarea
          name="description"
          rows={2}
          required
          className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] focus-ring"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label>
          <Label>HTML del reto</Label>
        </label>
        <p className="text-xs text-[var(--color-hint)]">
          Al terminar, tu HTML debe reportar el resultado con:{" "}
          <code className="rounded bg-white px-1 py-0.5">
            parent.postMessage(&#123;type:&quot;equidata-reto-result&quot;,
            score, total&#125;, &quot;*&quot;)
          </code>
        </p>
        <textarea
          name="contentHtml"
          rows={8}
          required
          placeholder="<!doctype html>…"
          className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 font-mono text-xs text-[var(--color-navy)] focus-ring"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="!px-4 !py-2 text-sm">
          Agregar reto
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!px-4 !py-2 text-sm"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
