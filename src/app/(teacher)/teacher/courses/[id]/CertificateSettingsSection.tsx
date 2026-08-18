"use client";

import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Course } from "@/lib/domain/types";

/** Descripción y duración del certificado — editables aparte, con su propio texto de respaldo si están vacíos. */
export function CertificateSettingsSection({
  course,
  onSaveDescription,
  onSaveDuration,
}: {
  course: Course;
  onSaveDescription: (value: string) => Promise<void>;
  onSaveDuration: (value: string) => Promise<void>;
}) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);

  async function submitDesc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSaveDescription(String(form.get("certificateDescription") ?? "").trim());
    setEditingDesc(false);
  }

  async function submitDuration(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSaveDuration(String(form.get("certificateDurationHours") ?? "").trim());
    setEditingDuration(false);
  }

  return (
    <>
      <div className="mt-6">
        <Label>Descripción del certificado</Label>
        {editingDesc ? (
          <form onSubmit={submitDesc} className="mt-2 space-y-2">
            <textarea
              name="certificateDescription"
              rows={2}
              defaultValue={course.certificateDescription ?? ""}
              placeholder="Texto de logro que aparece en el certificado. Si lo dejas vacío, se usa la descripción del curso."
              className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-hint)] focus-ring"
            />
            <div className="flex gap-2">
              <Button type="submit" className="!px-4 !py-2 text-sm">
                Guardar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!px-4 !py-2 text-sm"
                onClick={() => setEditingDesc(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-2 flex items-start justify-between gap-4">
            <p className="max-w-xl text-sm text-[var(--color-muted)]">
              {course.certificateDescription || (
                <span className="italic text-[var(--color-hint)]">
                  Sin texto propio — el certificado usa la descripción del curso.
                </span>
              )}
            </p>
            <Button
              variant="secondary"
              className="!px-3.5 !py-1.5 text-xs"
              onClick={() => setEditingDesc(true)}
            >
              Editar
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Label>Duración del certificado</Label>
        {editingDuration ? (
          <form onSubmit={submitDuration} className="mt-2 space-y-2">
            <Input
              name="certificateDurationHours"
              type="number"
              min={0}
              step={0.5}
              defaultValue={course.certificateDurationHours ?? ""}
              placeholder="Horas — si lo dejas vacío, se calcula sumando la duración de los módulos"
            />
            <div className="flex gap-2">
              <Button type="submit" className="!px-4 !py-2 text-sm">
                Guardar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!px-4 !py-2 text-sm"
                onClick={() => setEditingDuration(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-2 flex items-start justify-between gap-4">
            <p className="max-w-xl text-sm text-[var(--color-muted)]">
              {course.certificateDurationHours !== undefined ? (
                `${course.certificateDurationHours} horas`
              ) : (
                <span className="italic text-[var(--color-hint)]">
                  Sin duración propia — el certificado suma la de los módulos.
                </span>
              )}
            </p>
            <Button
              variant="secondary"
              className="!px-3.5 !py-1.5 text-xs"
              onClick={() => setEditingDuration(true)}
            >
              Editar
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
