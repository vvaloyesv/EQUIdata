"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import type { User } from "@/lib/domain/types";

/** Lista de inscritos + formulario para inscribir a un estudiante disponible. */
export function EnrolledStudentsSection({
  enrolledStudents,
  availableStudents,
  onEnroll,
}: {
  enrolledStudents: User[];
  availableStudents: User[];
  onEnroll: (userId: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const userId = String(form.get("userId") ?? "");
    if (!userId) return;
    await onEnroll(userId);
    setAdding(false);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <Label>Estudiantes inscritos</Label>
        {enrolledStudents.length > 0 && (
          <Badge tone="lavender">{enrolledStudents.length}</Badge>
        )}
      </div>

      {enrolledStudents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {enrolledStudents.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-white py-1.5 pl-1.5 pr-3.5 text-sm"
            >
              <Avatar name={s.displayName} size={26} />
              <span className="text-[var(--color-navy)]">{s.displayName}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        {adding ? (
          <Card bordered>
            {availableStudents.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                No hay más estudiantes disponibles para inscribir.
              </p>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="userId">
                    <Label>Estudiante</Label>
                  </label>
                  <select
                    id="userId"
                    name="userId"
                    required
                    defaultValue=""
                    className="w-full appearance-none rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
                  >
                    <option value="" disabled>
                      Selecciona un estudiante
                    </option>
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="!px-4 !py-2 text-sm">
                    Inscribir
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-4 !py-2 text-sm"
                    onClick={() => setAdding(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </Card>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Inscribir estudiante
          </Button>
        )}
      </div>
    </div>
  );
}
