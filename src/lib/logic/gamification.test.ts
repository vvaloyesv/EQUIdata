import { describe, expect, it } from "vitest";
import { computeStreak, dayKeyOf } from "./gamification";

const NOW = "2026-08-14T12:00:00.000Z"; // viernes

describe("computeStreak", () => {
  it("sin actividad → 0", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  it("actividad hoy → cuenta al menos 1", () => {
    expect(computeStreak(["2026-08-14T09:00:00.000Z"], NOW)).toBe(1);
  });

  it("hoy + ayer + anteayer → 3", () => {
    const dates = [
      "2026-08-14T09:00:00.000Z",
      "2026-08-13T09:00:00.000Z",
      "2026-08-12T09:00:00.000Z",
    ];
    expect(computeStreak(dates, NOW)).toBe(3);
  });

  it("sin actividad hoy pero sí ayer → la racha sigue viva", () => {
    expect(computeStreak(["2026-08-13T09:00:00.000Z"], NOW)).toBe(1);
  });

  it("hueco de un día corta la racha", () => {
    const dates = [
      "2026-08-14T09:00:00.000Z",
      "2026-08-12T09:00:00.000Z", // falta el 13 → corta acá
      "2026-08-11T09:00:00.000Z",
    ];
    expect(computeStreak(dates, NOW)).toBe(1);
  });

  it("última actividad hace 2 días (sin hoy ni ayer) → 0", () => {
    expect(computeStreak(["2026-08-12T09:00:00.000Z"], NOW)).toBe(0);
  });
});

describe("dayKeyOf", () => {
  it("extrae el día ISO (YYYY-MM-DD) de un timestamp", () => {
    expect(dayKeyOf("2026-08-14T12:00:00.000Z")).toBe("2026-08-14");
  });

  it("dos timestamps del mismo día dan la misma clave", () => {
    expect(dayKeyOf("2026-08-14T00:00:01.000Z")).toBe(
      dayKeyOf("2026-08-14T23:59:00.000Z"),
    );
  });
});
