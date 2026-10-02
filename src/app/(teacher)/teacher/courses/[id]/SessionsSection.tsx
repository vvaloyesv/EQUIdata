"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  onMove,
}: {
  sessions: TeacherSessionVM[];
  courseId: string;
  onAddSession: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onAddModule: (
    sessionId: string,
    currentModules: Module[],
    data: NewModuleData,
  ) => Promise<void>;
  /** Sube (-1) o baja (+1) una sesión en el orden del curso. */
  onMove?: (index: number, delta: -1 | 1) => Promise<void>;
}) {
  const [moving, setMoving] = useState(false);

  async function move(index: number, delta: -1 | 1) {
    if (!onMove || moving) return;
    setMoving(true);
    try {
      await onMove(index, delta);
    } finally {
      setMoving(false);
    }
  }

  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    await onAddSession(e);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      <Label>
        Sesiones · {sessions.length} · {sessions.reduce((a, s) => a + s.modules.length, 0)} módulos
      </Label>
      {sessions.map((s, i) => (
        <div key={s.session.id} className="flex items-start gap-2">
          {onMove && sessions.length > 1 && (
            <div className="flex shrink-0 flex-col gap-1 pt-4">
              <button
                type="button"
                aria-label={`Subir la sesión ${s.session.order}`}
                disabled={i === 0 || moving}
                onClick={() => void move(i, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-white hover:text-[var(--color-navy)] disabled:opacity-25"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                aria-label={`Bajar la sesión ${s.session.order}`}
                disabled={i === sessions.length - 1 || moving}
                onClick={() => void move(i, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-white hover:text-[var(--color-navy)] disabled:opacity-25"
              >
                <ChevronDown size={15} />
              </button>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <SessionEditor
              vm={s}
              courseId={courseId}
              onAddModule={(data) => onAddModule(s.session.id, s.modules, data)}
            />
          </div>
        </div>
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
