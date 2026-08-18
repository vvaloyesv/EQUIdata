import { describe, expect, it } from "vitest";
import { attemptGate, bestScore, isQuizResolved } from "./attempts";
import type { Attempt, Evaluation } from "@/lib/domain/types";

const NOW = "2026-08-13T12:00:00.000Z";

const quiz: Evaluation = {
  id: "e-quiz",
  courseId: "c",
  kind: "quiz",
  title: "Quiz",
  maxAttempts: 2,
  waitHours: 0,
  passingScore: 80,
  isActive: true,
};

const final: Evaluation = {
  id: "e-final",
  courseId: "c",
  kind: "diagnostic_final",
  title: "Final",
  maxAttempts: 2,
  waitHours: 8,
  passingScore: 80,
  isActive: true,
};

function attempt(score: number, submittedAt: string): Attempt {
  return {
    id: `a-${submittedAt}`,
    userId: "u",
    evaluationId: "e",
    startedAt: submittedAt,
    submittedAt,
    score,
    status: "submitted",
  };
}

describe("bestScore", () => {
  it("toma la nota más alta, no la última", () => {
    expect(
      bestScore([
        attempt(90, "2026-08-01T00:00:00Z"),
        attempt(60, "2026-08-02T00:00:00Z"),
      ]),
    ).toBe(90);
  });
});

describe("attemptGate — quiz", () => {
  it("permite intentos hasta el tope", () => {
    const g = attemptGate({ evaluation: quiz, attempts: [], nowIso: NOW });
    expect(g.canAttempt).toBe(true);
    expect(g.usedAttempts).toBe(0);
  });

  it("bloquea al agotar los 2 intentos sin aprobar", () => {
    const g = attemptGate({
      evaluation: quiz,
      attempts: [attempt(50, "2026-08-01T00:00:00Z"), attempt(70, "2026-08-02T00:00:00Z")],
      nowIso: NOW,
    });
    expect(g.canAttempt).toBe(false);
    expect(g.passed).toBe(false);
  });

  it("marca aprobado con el mejor intento ≥ 80", () => {
    const g = attemptGate({
      evaluation: quiz,
      attempts: [attempt(85, "2026-08-01T00:00:00Z")],
      nowIso: NOW,
    });
    expect(g.passed).toBe(true);
  });

  it("reabrir intentos otorga cupo adicional", () => {
    const g = attemptGate({
      evaluation: quiz,
      attempts: [attempt(50, "2026-08-01T00:00:00Z"), attempt(70, "2026-08-02T00:00:00Z")],
      nowIso: NOW,
      bonusAttempts: 1,
    });
    expect(g.canAttempt).toBe(true);
  });
});

describe("isQuizResolved", () => {
  it("resuelto = aprobado", () => {
    const r = isQuizResolved({
      evaluation: quiz,
      attempts: [attempt(85, "2026-08-01T00:00:00Z")],
      nowIso: NOW,
    });
    expect(r.passed).toBe(true);
  });

  it("resuelto = intentos agotados sin aprobar", () => {
    const r = isQuizResolved({
      evaluation: quiz,
      attempts: [attempt(50, "2026-08-01T00:00:00Z"), attempt(70, "2026-08-02T00:00:00Z")],
      nowIso: NOW,
    });
    expect(r.attemptsExhausted).toBe(true);
  });
});

describe("attemptGate — diagnóstico final (tandas de 8h)", () => {
  it("permite los 2 intentos de la primera tanda", () => {
    const g0 = attemptGate({ evaluation: final, attempts: [], nowIso: NOW });
    expect(g0.canAttempt).toBe(true);
    const g1 = attemptGate({
      evaluation: final,
      attempts: [attempt(40, "2026-08-13T08:00:00.000Z")],
      nowIso: NOW,
    });
    expect(g1.canAttempt).toBe(true);
  });

  it("tras agotar la tanda, exige esperar 8h", () => {
    const g = attemptGate({
      evaluation: final,
      attempts: [
        attempt(40, "2026-08-13T09:00:00.000Z"),
        attempt(50, "2026-08-13T10:00:00.000Z"),
      ],
      nowIso: "2026-08-13T12:00:00.000Z", // solo 2h después
    });
    expect(g.canAttempt).toBe(false);
    expect(g.availableAtIso).toBe("2026-08-13T18:00:00.000Z");
  });

  it("pasadas 8h abre una nueva tanda", () => {
    const g = attemptGate({
      evaluation: final,
      attempts: [
        attempt(40, "2026-08-13T09:00:00.000Z"),
        attempt(50, "2026-08-13T10:00:00.000Z"),
      ],
      nowIso: "2026-08-13T18:30:00.000Z",
    });
    expect(g.canAttempt).toBe(true);
  });
});
