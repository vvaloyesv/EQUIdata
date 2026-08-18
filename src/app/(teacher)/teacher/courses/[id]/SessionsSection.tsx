"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SessionEditor } from "@/components/teacher/SessionEditor";
import type { Module } from "@/lib/domain/types";
import type { TeacherSessionVM } from "@/lib/teacher/course";
import type { NewModuleData } from "./useTeacherCourseActions";

/** Sesiones del curso (con sus módulos) + formulario para crear una nueva. */
export function SessionsSection({
  sessions,
  courseId,
  onAddSession,
  onAddModule,
}: {
  sessions: TeacherSessionVM[];
  courseId: string;
  onAddSession: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onAddModule: (
    sessionId: string,
    currentModules: Module[],
    data: NewModuleData,
  ) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    await onAddSession(e);
    setAdding(false);
  }

  return (
    <div className="mt-6 space-y-3">
      <Label>Sesiones</Label>
      {sessions.map((s) => (
        <SessionEditor
          key={s.session.id}
          vm={s}
          courseId={courseId}
          onAddModule={(data) => onAddModule(s.session.id, s.modules, data)}
        />
      ))}

      {adding ? (
        <Card bordered>
          <form onSubmit={submit} className="space-y-3">
            <Input name="title" label="Título de la sesión" placeholder="Medidas de tendencia central" required />
            <Input name="unlockDate" label="Fecha de liberación" type="date" />
            <div className="flex gap-2">
              <Button type="submit" className="!px-4 !py-2 text-sm">
                Crear sesión
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
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + Crear sesión
        </Button>
      )}
    </div>
  );
}
