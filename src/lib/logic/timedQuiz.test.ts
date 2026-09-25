import { describe, expect, it } from "vitest";
import type { Attempt, Evaluation } from "@/lib/domain/types";
import { attemptGate } from "./attempts";
import {
  abandonedAttempts,
  formatCountdown,
  isTimedEvaluation,
  QUESTION_SECONDS,
  secondsLeft,
} from "./timedQuiz";

const quiz: Evaluation = {
  id: "e1",
  kind: "quiz",
  title: "Quiz",
  maxAttempts: 2,
  waitHours: 0,
  passingScore: 80,
  isActive: true,
};

const attempt = (id: string, status: Attempt["status"], score?: number): Attempt => ({
  id,
  userId: "u1",
  evaluationId: "e1",
  startedAt: "2026-09-24T10:00:00.000Z",
  submittedAt: status === "submitted" ? "2026-09-24T10:05:00.000Z" : undefined,
  score,
  status,
});

describe("quiz cronometrado", () => {
  it("aplica a quizzes de sesión y de tutorial, no a diagnósticos ni onboarding", () => {
    expect(isTimedEvaluation({ kind: "quiz" })).toBe(true);
    expect(isTimedEvaluation({ kind: "tutorial_quiz" })).toBe(true);
    expect(isTimedEvaluation({ kind: "diagnostic_initial" })).toBe(false);
    expect(isTimedEvaluation({ kind: "diagnostic_final" })).toBe(false);
    expect(isTimedEvaluation({ kind: "interest_onboarding" })).toBe(false);
  });

  it("45 segundos por pregunta", () => {
    expect(QUESTION_SECONDS).toBe(45);
  });

  it("contador: redondea hacia arriba y nunca baja de 0", () => {
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(10_000, 9_001)).toBe(1);
    expect(secondsLeft(10_000, 10_000)).toBe(0);
    expect(secondsLeft(10_000, 20_000)).toBe(0);
    expect(formatCountdown(45)).toBe("0:45");
    expect(formatCountdown(7)).toBe("0:07");
    expect(formatCountdown(-3)).toBe("0:00");
  });

  it("un intento empezado y no terminado cuenta como usado (salirse no da otro intento)", () => {
    const gate = attemptGate({
      evaluation: quiz,
      attempts: [attempt("a1", "submitted", 40), attempt("a2", "in_progress")],
      nowIso: "2026-09-24T12:00:00.000Z",
    });
    expect(gate.usedAttempts).toBe(2);
    expect(gate.canAttempt).toBe(false);
  });

  it("la profesora puede reabrir: un intento extra habilita otro", () => {
    const gate = attemptGate({
      evaluation: quiz,
      attempts: [attempt("a1", "submitted", 40), attempt("a2", "in_progress")],
      nowIso: "2026-09-24T12:00:00.000Z",
      bonusAttempts: 1,
    });
    expect(gate.canAttempt).toBe(true);
    // La pantalla dice "intento 3 de 3", no "3 de 2".
    expect(gate.usedAttempts + 1).toBe(3);
    expect(gate.attemptCap).toBe(3);
  });

  it("en diagnósticos (sin cronómetro) un intento abierto no cuenta, como antes", () => {
    const gate = attemptGate({
      evaluation: { ...quiz, kind: "diagnostic_initial", maxAttempts: 1 },
      attempts: [attempt("a1", "in_progress")],
      nowIso: "2026-09-24T12:00:00.000Z",
    });
    expect(gate.canAttempt).toBe(true);
  });

  it("identifica los intentos abandonados", () => {
    expect(abandonedAttempts([attempt("a1", "submitted", 90), attempt("a2", "in_progress")]).map((a) => a.id)).toEqual(["a2"]);
  });
});
