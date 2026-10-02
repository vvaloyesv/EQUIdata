"use client";

import { Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/LockedState";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { daysUntil, formatDayMonth, relativeDays } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/domain/types";

const KIND_LABEL: Record<CalendarEvent["kind"], string> = {
  unlock: "Liberación de sesión",
  evaluation: "Evaluación",
  deadline: "Entrega",
  event: "Evento",
};

/**
 * Calendario de solo lectura (spec §5.9): no tiene modelo propio, agrega
 * fechas ya existentes (desbloqueos de sesión, evaluaciones, entregas). Una
 * línea "HOY" separa lo que pasó de lo que viene (auditoría §11.3); la
 * próxima fecha va destacada con su cuenta regresiva.
 */
export default function CalendarPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: events, loading } = useRepoQuery(
    ["calendar", userId],
    () => getRepository().listCalendarEvents(userId),
    { enabled: !!user },
  );

  if (loading || !events) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((ev) => daysUntil(ev.date) >= 0);
  const next = upcoming[0];
  const todayIso = new Date().toISOString();

  // Filas en orden, con la marca de "hoy" insertada donde corresponde.
  type Row = { kind: "event"; ev: CalendarEvent } | { kind: "today" };
  const rows: Row[] = [];
  let todayPlaced = false;
  for (const ev of sorted) {
    if (!todayPlaced && daysUntil(ev.date) >= 0) {
      rows.push({ kind: "today" });
      todayPlaced = true;
    }
    rows.push({ kind: "event", ev });
  }
  if (!todayPlaced) rows.push({ kind: "today" });

  let lastMonth = "";

  return (
    <div>
      <PageHeader
        eyebrow={
          next
            ? `Próxima fecha · ${formatDayMonth(next.date)} · ${relativeDays(next.date)}`
            : `${sorted.length} fechas · ninguna pendiente`
        }
        title="Calendario"
        description="Liberación de sesiones y evaluaciones de tus cursos."
      />
      <PageBody width="reading">
        {sorted.length === 0 ? (
          <EmptyState
            title="Tus cursos todavía no tienen fechas."
            hint="Cuando tu profesora programe la liberación de una sesión o una evaluación, aparecerá aquí."
          />
        ) : (
          <ol className="relative">
            {rows.map((row, i) => {
              if (row.kind === "today") {
                return (
                  <li key="today" className="my-5 flex items-center gap-3" aria-label="Hoy">
                    <span className="rounded-[var(--radius-pill)] bg-[var(--color-coral)] px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-white">
                      Hoy · {formatDayMonth(todayIso)}
                    </span>
                    <span className="h-px flex-1 bg-[var(--color-coral)]/50" />
                  </li>
                );
              }
              const { ev } = row;
              const d = new Date(ev.date);
              const month = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
              const showMonth = month !== lastMonth;
              lastMonth = month;
              const past = daysUntil(ev.date) < 0;
              const isNext = ev.id === next?.id;
              return (
                <Fragment key={ev.id + i}>
                  {showMonth && (
                    <li className="mb-2 mt-6 first:mt-0">
                      <Label className="capitalize">{month}</Label>
                    </li>
                  )}
                  <li
                    className={cn(
                      "mb-2 flex items-center gap-4 rounded-[var(--radius-card)] border bg-white px-5 py-4",
                      isNext ? "border-[var(--color-navy)]" : "border-[var(--color-divider)]",
                      past && "bg-transparent",
                    )}
                  >
                    <div className="w-10 shrink-0 text-center">
                      <div
                        className={cn(
                          "font-display text-2xl tabular-nums leading-none",
                          past ? "text-[var(--color-hint)]" : "text-[var(--color-navy)]",
                        )}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-[var(--color-divider)] pl-4">
                      <p className={cn("text-sm", past ? "text-[var(--color-muted)]" : "text-[var(--color-navy)]")}>
                        {ev.title}
                      </p>
                      <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                        {KIND_LABEL[ev.kind]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.1em]",
                        isNext
                          ? "rounded-[var(--radius-pill)] bg-[var(--color-navy)] px-2.5 py-1 text-white"
                          : "text-[var(--color-muted)]",
                      )}
                    >
                      {relativeDays(ev.date)}
                    </span>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
      </PageBody>
    </div>
  );
}
