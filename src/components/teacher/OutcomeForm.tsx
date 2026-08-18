"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function OutcomeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { code: string; name: string; expectedLevel: number }) => void;
  onCancel: () => void;
}) {
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit({
      code: String(form.get("code") ?? ""),
      name: String(form.get("name") ?? ""),
      expectedLevel: Number(form.get("expectedLevel") ?? 60),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-[100px_1fr_140px_auto] items-end gap-2 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-[var(--color-canvas)] p-3"
    >
      <Input name="code" label="Código" placeholder="RA1" required />
      <Input name="name" label="Nombre" placeholder="Teoría básica" required />
      <Input
        name="expectedLevel"
        label="Nivel esperado (%)"
        type="number"
        min={0}
        max={100}
        defaultValue={60}
        required
      />
      <div className="flex gap-1.5">
        <Button type="submit" className="!px-3 !py-2.5 text-xs">
          Agregar
        </Button>
        <Button type="button" variant="secondary" className="!px-3 !py-2.5 text-xs" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
