/**
 * Gamificación real (M5): racha de días y clave de día para el check-in de
 * ánimo (M9: pasó de semanal a diario). XP y créditos siguen en fachada —
 * quedan pendientes de que retos y tutoriales tengan seguimiento propio
 * (spec §4.3, decisión de la ronda).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Día ISO (YYYY-MM-DD, UTC) — clave del check-in de ánimo diario y de la racha. */
export function dayKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Días consecutivos con actividad, terminando hoy o ayer. Si hoy todavía no
 * hay actividad la racha no se rompe (el día no ha terminado); se rompe solo
 * cuando pasa un día completo sin ninguna.
 */
export function computeStreak(activityDatesIso: string[], nowIso: string): number {
  const days = new Set(activityDatesIso.filter(Boolean).map(dayKeyOf));
  if (days.size === 0) return 0;

  let cursor = new Date(dayKeyOf(nowIso) + "T00:00:00.000Z").getTime();
  if (!days.has(dayKeyOf(new Date(cursor).toISOString()))) {
    cursor -= DAY_MS; // hoy sin actividad todavía: empieza a contar desde ayer.
  }

  let streak = 0;
  while (days.has(dayKeyOf(new Date(cursor).toISOString()))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}
