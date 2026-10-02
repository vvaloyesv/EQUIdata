/**
 * Fechas legibles para etiquetas mono ("EN 4 DÍAS", "28 SEP"). Se cuentan
 * días de calendario en la zona horaria de quien mira, no bloques de 24 h:
 * algo que se libera mañana a las 8:00 es "mañana" aunque falten 10 horas.
 */

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Días de calendario desde hoy hasta la fecha (negativo si ya pasó). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / 86_400_000);
}

/** "HOY", "MAÑANA", "EN 4 DÍAS", "AYER", "HACE 3 DÍAS". */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const d = daysUntil(iso, now);
  if (d === 0) return "HOY";
  if (d === 1) return "MAÑANA";
  if (d === -1) return "AYER";
  return d > 0 ? `EN ${d} DÍAS` : `HACE ${-d} DÍAS`;
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/** "28 SEP" (el formato corto de es-CO da "28 de sept", que no cabe en las etiquetas). */
export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
