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

/**
 * Inyección de fórmulas (CSV injection): Excel, Sheets y LibreOffice ejecutan
 * como fórmula una celda que empieza por = + - @ (o tabulador / retorno). Las
 * respuestas abiertas las escribe cada estudiante, así que un
 * `=HYPERLINK(...)` se ejecutaría en el computador de la profesora al abrir
 * el archivo. Se antepone un apóstrofo, que la hoja muestra como texto.
 * Los números propios (notas, %) nunca empiezan así, así que no se tocan.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: string): string {
  const safe = neutralizeFormula(value);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
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
