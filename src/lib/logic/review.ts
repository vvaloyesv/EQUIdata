/**
 * Sesiones de repaso (spec §5.7) — Opción B: calculado, sin modelo nuevo.
 *
 * Al completar la sesión N, el repaso re-presenta los módulos ya existentes de
 * las sesiones N y N-1. Terminó la 4 → repaso de 4 y 3. Terminó la 6 → 6 y 5.
 */

import type { Module, Session } from "@/lib/domain/types";

export interface ReviewInput {
  /** Sesiones del curso, en orden. */
  sessions: Session[];
  /** Módulos por sessionId. */
  modulesBySession: Record<string, Module[]>;
  /** Ids de módulos completados por la persona. */
  completedModuleIds: Set<string>;
}

export interface ReviewResult {
  /** Orden de la última sesión completada (undefined si ninguna). */
  lastCompletedOrder?: number;
  /** Módulos sugeridos para repaso (de las sesiones N y N-1). */
  modules: Module[];
}

/** Una sesión está completa si todos sus módulos están completados (y tiene ≥1). */
function isSessionComplete(
  session: Session,
  modulesBySession: Record<string, Module[]>,
  completed: Set<string>,
): boolean {
  const mods = modulesBySession[session.id] ?? [];
  if (mods.length === 0) return false;
  return mods.every((m) => completed.has(m.id));
}

export function reviewModules(input: ReviewInput): ReviewResult {
  const { sessions, modulesBySession, completedModuleIds } = input;
  const ordered = [...sessions].sort((a, b) => a.order - b.order);

  // Última sesión completa (mayor order).
  let last: Session | undefined;
  for (const s of ordered) {
    if (isSessionComplete(s, modulesBySession, completedModuleIds)) last = s;
  }
  if (!last) return { modules: [] };

  const prev = ordered.find((s) => s.order === last!.order - 1);
  const picked = [last, ...(prev ? [prev] : [])];

  const modules = picked
    .flatMap((s) => modulesBySession[s.id] ?? [])
    .sort((a, b) => a.order - b.order);

  return { lastCompletedOrder: last.order, modules };
}
