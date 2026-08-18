"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { ModuleType } from "@/lib/domain/types";

export function ModuleForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: {
    type: ModuleType;
    title: string;
    description: string;
    videoUrl?: string;
    contentHtml?: string;
    durationMin: number;
  }) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<ModuleType>("video");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit({
      type,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      videoUrl: type === "video" ? String(form.get("videoUrl") ?? "") : undefined,
      contentHtml: type === "html" ? String(form.get("contentHtml") ?? "") : undefined,
      durationMin: Number(form.get("durationMin") ?? 10),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-[var(--color-canvas)] p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Tipo"
          options={["video", "html"]}
          onChange={(e) => setType(e.target.value as ModuleType)}
        />
        <Input name="durationMin" label="Duración (min)" type="number" min={1} defaultValue={10} required />
      </div>
      <Input name="title" label="Título" placeholder="Media, mediana y moda" required />
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
      {type === "video" ? (
        <Input
          name="videoUrl"
          label="URL del video de YouTube"
          placeholder="https://www.youtube.com/watch?v=…"
          required
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <label>
            <Label>HTML embebido</Label>
          </label>
          <textarea
            name="contentHtml"
            rows={5}
            required
            placeholder="<!doctype html>…"
            className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 font-mono text-xs text-[var(--color-navy)] focus-ring"
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="!px-4 !py-2 text-sm">
          Agregar módulo
        </Button>
        <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
