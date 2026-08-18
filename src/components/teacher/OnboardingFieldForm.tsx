"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export interface OnboardingFieldSubmitData {
  label: string;
  type: "text" | "select";
  options?: string[];
}

export function OnboardingFieldForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: OnboardingFieldSubmitData) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<"text" | "select">("text");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const label = String(form.get("label") ?? "").trim();
    if (!label) return;
    const options =
      type === "select"
        ? String(form.get("options") ?? "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;
    if (type === "select" && (!options || options.length === 0)) return;
    onSubmit({ label, type, options });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-[var(--color-canvas)] p-3"
    >
      <Input name="label" label="Pregunta / campo" placeholder="Años de experiencia" required />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="onboarding-field-type">
          <Label>Tipo de respuesta</Label>
        </label>
        <select
          id="onboarding-field-type"
          value={type}
          onChange={(e) => setType(e.target.value as "text" | "select")}
          className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
        >
          <option value="text">Texto libre</option>
          <option value="select">Lista de opciones</option>
        </select>
      </div>

      {type === "select" && (
        <Input
          name="options"
          label="Opciones (separadas por coma)"
          placeholder="Menos de 1 año, 1 a 3 años, Más de 3 años"
          required
        />
      )}

      <div className="flex gap-2">
        <Button type="submit" className="!px-4 !py-2 text-sm">
          Agregar campo
        </Button>
        <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
