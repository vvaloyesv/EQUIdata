"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function ArchetypeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}) {
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-[var(--color-canvas)] p-3"
    >
      <Input name="name" label="Nombre del arquetipo" placeholder="Entusiasta de los datos" required />
      <div className="flex flex-col gap-1.5">
        <label>
          <Label>Descripción (lo que ve la persona como resultado)</Label>
        </label>
        <textarea
          name="description"
          rows={2}
          required
          placeholder="Te emociona encontrar patrones en los números y disfrutas explorar antes de sacar conclusiones."
          className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] focus-ring"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="!px-4 !py-2 text-sm">
          Agregar arquetipo
        </Button>
        <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
