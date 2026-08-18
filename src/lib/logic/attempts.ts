/**
 * Control de intentos (spec §5.4).
 *
 * - Quiz y diagnóstico inicial: hasta `maxAttempts` intentos, sin espera.
 * - Diagnóstico final: intentos en TANDAS de `maxAttempts` (default 2). Al
 *   agotar una tanda sin aprobar, se espera `waitHours` (8) para la siguiente,
 *   y así hasta alcanzar el 80%. Es decir: no hay tope total de intentos.
 *
 * `bestScore` toma la nota más alta de los intentos (para reportes y para saber
 * si aprobó). El profesor puede reabrir intentos (reopenAttempts), lo que
 * equivale a subir el tope efectivo.
 */

import type { Attempt, Evaluation } from "@/lib/domain/types";

export interface AttemptGate {
  /** ¿Puede iniciar un nuevo intento ahora? */
  canAttempt: boolean;
  /** Motivo cuando no puede. */
  reasonLabel?: string;
  /** ISO en que se habilita el siguiente intento (diagnóstico final en espera). */
  availableAtIso?: string;
  /** Intentos ya enviados. */
  usedAttempts: number;
  /** Mejor nota lograda (0–100), o undefined si no ha enviado. */
  bestScore?: number;
  /** ¿Ya aprobó (bestScore ≥ passingScore)? */
  passed: boolean;
}

function submitted(attempts: Attempt[]): Attempt[] {
  return attempts
    .filter((a) => a.status === "submitted" && a.submittedAt)
    .sort((a, b) => a.submittedAt!.localeCompare(b.submittedAt!));
}

export function bestScore(attempts: Attempt[]): number | undefined {
  const done = submitted(attempts).filter((a) => a.score !== undefined);
  if (!done.length) return undefined;
  return Math.max(...done.map((a) => a.score!));
}

export interface GateContext {
  evaluation: Evaluation;
  attempts: Attempt[];
  nowIso: string;
  /** Intentos extra otorgados por el profesor (reabrir). */
  bonusAttempts?: number;
}

export function attemptGate(ctx: GateContext): AttemptGate {
  const { evaluation, attempts, nowIso, bonusAttempts = 0 } = ctx;
  const done = submitted(attempts);
  const used = done.length;
  const best = bestScore(attempts);
  const passing = evaluation.passingScore ?? Infinity;
  const passed = best !== undefined && best >= passing;

  const base: AttemptGate = {
    canAttempt: false,
    usedAttempts: used,
    bestScore: best,
    passed,
  };

  // Ya aprobó → no necesita más intentos.
  if (passed) {
    return { ...base, reasonLabel: "Ya aprobaste esta evaluación" };
  }

  if (evaluation.kind === "diagnostic_final") {
    // Tandas de maxAttempts cada waitHours, sin tope total.
    const perBatch = evaluation.maxAttempts;
    const inCurrentBatch = used % perBatch;

    if (inCurrentBatch !== 0 || used === 0) {
      // Aún quedan intentos en la tanda actual.
      return { ...base, canAttempt: true };
    }

    // Tanda completada sin aprobar → esperar waitHours desde el último envío.
    const last = done[done.length - 1];
    const availableAt = new Date(
      new Date(last.submittedAt!).getTime() + evaluation.waitHours * 3600_000,
    );
    if (new Date(nowIso).getTime() >= availableAt.getTime()) {
      return { ...base, canAttempt: true };
    }
    return {
      ...base,
      reasonLabel: `Nueva tanda de intentos disponible en 8 horas`,
      availableAtIso: availableAt.toISOString(),
    };
  }

  // Quiz / diagnóstico inicial: tope fijo (+ bonus del profesor).
  const cap = evaluation.maxAttempts + bonusAttempts;
  if (used < cap) {
    return { ...base, canAttempt: true };
  }
  return {
    ...base,
    reasonLabel: "Agotaste tus intentos",
  };
}

/** ¿Está "resuelto" el quiz para efectos de desbloqueo? (aprobado o agotado) */
export function isQuizResolved(ctx: GateContext): {
  passed: boolean;
  attemptsExhausted: boolean;
} {
  const gate = attemptGate(ctx);
  return {
    passed: gate.passed,
    attemptsExhausted: !gate.canAttempt && !gate.passed && !gate.availableAtIso,
  };
}
