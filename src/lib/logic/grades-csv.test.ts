import { describe, expect, it } from "vitest";
import { gradesToCsv, type GradeRow } from "./grades-csv";

const row = (answer: string): GradeRow => ({
  studentName: "Ana Pérez",
  email: "ana@fundacionwwbcol.org",
  evaluationTitle: "Quiz 1",
  score: 80,
  outcomeAchieved: { RA1: 75 },
  outcomeExpected: { RA1: 60 },
  questionAnswers: [answer],
});

describe("gradesToCsv", () => {
  it("arma encabezado y fila con RA y respuestas", () => {
    const csv = gradesToCsv([row("La mediana")], ["RA1"], ["P1: ¿Qué es?"]);
    const [header, line] = csv.split("\r\n");
    expect(header).toBe("Estudiante,Correo,Evaluación,Nota global (%),RA1 logrado (%),RA1 esperado (%),P1: ¿Qué es?");
    expect(line).toBe("Ana Pérez,ana@fundacionwwbcol.org,Quiz 1,80,75,60,La mediana");
  });

  it("escapa comillas, comas y saltos de línea (RFC 4180)", () => {
    const line = gradesToCsv([row('Dijo "sí", luego\r\nno')], [], ["P1"]).split("\r\n").slice(1).join("\r\n");
    expect(line.endsWith('"Dijo ""sí"", luego\r\nno"')).toBe(true);
  });

  it("neutraliza fórmulas en lo que escribe cada estudiante (CSV injection)", () => {
    for (const payload of ['=HYPERLINK("http://x","ver")', "+1+1", "-2+3", "@SUM(A1)", "\t=1"]) {
      const line = gradesToCsv([row(payload)], [], ["P1"]).split("\r\n")[1];
      // La celda (entre comillas si trae comas o comillas) empieza por apóstrofo.
      const expected = `'${payload}`;
      const quoted = `"${expected.replace(/"/g, '""')}"`;
      expect(line.endsWith(`,${expected}`) || line.endsWith(`,${quoted}`)).toBe(true);
    }
  });

  it("no toca las notas ni el texto normal", () => {
    const line = gradesToCsv([row("Respuesta normal")], ["RA1"], ["P1"]).split("\r\n")[1];
    expect(line).not.toContain("'");
  });
});
