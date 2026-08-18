"use client";

import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/LockedState";
import type { CalendarEvent } from "@/lib/domain/types";

const KIND_LABEL: Record<CalendarEvent["kind"], string> = {
  unlock: "Liberación de sesión",
  evaluation: "Evaluación",
  deadline: "Entrega",
  event: "Evento",
};

const KIND_TONE: Record<CalendarEvent["kind"], "lime" | "coral" | "lavender" | "neutral"> = {
  unlock: "lime",
  evaluation: "coral",
  deadline: "coral",
  event: "lavender",
};

/**
 * Calendario de solo lectura (spec §5.9): no tiene modelo propio, agrega
 * fechas ya existentes (desbloqueos de sesión, evaluaciones, entregas).
 */
export default function CalendarPage() {
  const { user } = useAuth();
  const { data: events, loading } = useAsync(
    () =>
      user ? getRepository().listCalendarEvents(user.id) : Promise.resolve([]),
    [user?.id],
  );

  if (loading || !events) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const groups = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const d = new Date(ev.date);
    const key = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Label>Vista general</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Calendario
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Fechas de tus cursos: liberación de sesiones y evaluaciones.
      </p>

      {events.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Sin fechas próximas" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {[...groups.entries()].map(([month, monthEvents]) => (
            <div key={month}>
              <Label className="capitalize">{month}</Label>
              <div className="mt-2 space-y-2">
                {monthEvents.map((ev) => {
                  const d = new Date(ev.date);
                  return (
                    <Card key={ev.id} bordered className="!p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 shrink-0 text-center">
                          <div className="font-display tabular text-xl text-[var(--color-navy)]">
                            {d.getDate()}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 border-l border-[var(--color-divider)] pl-4">
                          <p className="text-sm text-[var(--color-navy)]">{ev.title}</p>
                        </div>
                        <Badge tone={KIND_TONE[ev.kind]}>{KIND_LABEL[ev.kind]}</Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
