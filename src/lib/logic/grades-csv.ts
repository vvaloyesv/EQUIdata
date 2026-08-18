/**
 * Serialización de calificaciones a CSV (spec §5.11).
 *
 * Genera CSV con nota global y desglose por resultado de aprendizaje. Pensado
 * para que el profesor lo descargue y revise por fuera. Escapa comillas y
 * separadores según RFC 4180.
 */

export interface GradeRow {
  studentName: string;
  email: string;
  evaluationTitle: string;
  score: number | null;
  /** { "RA1": 30, "RA2": 55 } — % logrado por dimensión. */
  outcomeAchieved: Record<string, number>;
  /** { "RA1": 60, "RA2": 70 } — % esperado por dimensión. */
  outcomeExpected: Record<string, number>;
  /** Respuesta de la persona por pregunta, indexada por el mismo orden que questionLabels. */
  questionAnswers: string[];
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function gradesToCsv(
  rows: GradeRow[],
  outcomeCodes: string[],
  questionLabels: string[] = [],
): string {
  const header = [
    "Estudiante",
    "Correo",
    "Evaluación",
    "Nota global (%)",
    ...outcomeCodes.flatMap((c) => [`${c} logrado (%)`, `${c} esperado (%)`]),
    ...questionLabels,
  ];

  const lines = rows.map((r) => {
    const cells = [
      r.studentName,
      r.email,
      r.evaluationTitle,
      r.score === null ? "" : String(r.score),
      ...outcomeCodes.flatMap((c) => [
        r.outcomeAchieved[c] !== undefined ? String(r.outcomeAchieved[c]) : "",
        r.outcomeExpected[c] !== undefined ? String(r.outcomeExpected[c]) : "",
      ]),
      ...questionLabels.map((_, i) => r.questionAnswers[i] ?? ""),
    ];
    return cells.map((c) => escapeCsv(String(c))).join(",");
  });

  return [header.map(escapeCsv).join(","), ...lines].join("\r\n");
}
