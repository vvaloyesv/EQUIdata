import { describe, expect, it } from "vitest";
import { sessionUnlockState } from "./unlock";
import type { Session } from "@/lib/domain/types";

const NOW = "2026-08-13T12:00:00.000Z";
const past = "2026-07-01T00:00:00.000Z";
const future = "2026-09-15T00:00:00.000Z";

function session(unlockDate?: string): Session {
  return { id: "s", courseId: "c", order: 2, title: "S", unlockDate };
}

describe("sessionUnlockState", () => {
  it("bloquea todo si falta el diagnóstico inicial", () => {
    const r = sessionUnlockState({
      session: session(past),
      isFirst: true,
      diagnosticDone: false,
      nowIso: NOW,
    });
    expect(r.unlocked).toBe(false);
    expect(r.reason).toBe("diagnostic_pending");
  });

  it("bloquea por fecha futura aunque el quiz esté aprobado", () => {
    const r = sessionUnlockState({
      session: session(future),
      isFirst: false,
      prevQuiz: { exists: true, passed: true, attemptsExhausted: false },
      diagnosticDone: true,
      nowIso: NOW,
    });
    expect(r.unlocked).toBe(false);
    expect(r.reason).toBe("date");
  });

  it("bloquea por quiz sin resolver aunque la fecha ya llegó", () => {
    const r = sessionUnlockState({
      session: session(past),
      isFirst: false,
      prevQuiz: { exists: true, passed: false, attemptsExhausted: false },
      diagnosticDone: true,
      nowIso: NOW,
    });
    expect(r.unlocked).toBe(false);
    expect(r.reason).toBe("prev_quiz");
  });

  it("abre con fecha alcanzada + quiz aprobado", () => {
    const r = sessionUnlockState({
      session: session(past),
      isFirst: false,
      prevQuiz: { exists: true, passed: true, attemptsExhausted: false },
      diagnosticDone: true,
      nowIso: NOW,
    });
    expect(r.unlocked).toBe(true);
  });

  it("abre aunque el quiz no se aprobó si se agotaron los intentos", () => {
    const r = sessionUnlockState({
      session: session(past),
      isFirst: false,
      prevQuiz: { exists: true, passed: false, attemptsExhausted: true },
      diagnosticDone: true,
      nowIso: NOW,
    });
    expect(r.unlocked).toBe(true);
  });

  it("la primera sesión se rige solo por la fecha", () => {
    const r = sessionUnlockState({
      session: session(past),
      isFirst: true,
      diagnosticDone: true,
      nowIso: NOW,
    });
    expect(r.unlocked).toBe(true);
  });
});
