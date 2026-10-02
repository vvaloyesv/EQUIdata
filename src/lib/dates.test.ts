import { describe, expect, it } from "vitest";
import { daysUntil, formatDayMonth, relativeDays } from "./dates";

const now = new Date(2026, 8, 24, 18, 30); // 24 sep 2026, 6:30 p. m.

describe("fechas relativas", () => {
  it("cuenta días de calendario, no bloques de 24 h", () => {
    expect(daysUntil(new Date(2026, 8, 25, 8, 0).toISOString(), now)).toBe(1);
    expect(daysUntil(new Date(2026, 8, 24, 23, 59).toISOString(), now)).toBe(0);
    expect(daysUntil(new Date(2026, 8, 28).toISOString(), now)).toBe(4);
    expect(daysUntil(new Date(2026, 6, 14).toISOString(), now)).toBeLessThan(0);
  });

  it("etiquetas en mayúscula para la microcopy mono", () => {
    expect(relativeDays(new Date(2026, 8, 24, 9).toISOString(), now)).toBe("HOY");
    expect(relativeDays(new Date(2026, 8, 25).toISOString(), now)).toBe("MAÑANA");
    expect(relativeDays(new Date(2026, 8, 28).toISOString(), now)).toBe("EN 4 DÍAS");
    expect(relativeDays(new Date(2026, 8, 23).toISOString(), now)).toBe("AYER");
    expect(relativeDays(new Date(2026, 8, 20).toISOString(), now)).toBe("HACE 4 DÍAS");
  });

  it("fecha corta que cabe en una etiqueta", () => {
    expect(formatDayMonth(new Date(2026, 8, 28).toISOString())).toBe("28 SEP");
    expect(formatDayMonth(new Date(2026, 6, 14).toISOString())).toBe("14 JUL");
  });
});
