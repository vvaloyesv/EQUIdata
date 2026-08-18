/**
 * Desbloqueo de sesiones (spec §5.5) — doble condición.
 *
 * Una sesión se abre solo cuando:
 *   1) llegó su fecha de liberación, Y
 *   2) el quiz de la sesión anterior está RESUELTO (aprobado, o con los intentos
 *      agotados — el quiz nunca deja a nadie en un callejón sin salida).
 *
 * La primera sesión no tiene quiz previo: se rige solo por la fecha.
 * Antes de todo, el diagnóstico inicial es la puerta de entrada del curso.
 */

import type { Session, SessionUnlockState } from "@/lib/domain/types";

/** Estado del quiz de la sesión anterior, resumido para la regla. */
export interface PrevQuizState {
  /** ¿Existe un quiz en la sesión anterior? */
  exists: boolean;
  /** ¿Aprobado (mejor intento ≥ passingScore)? */
  passed: boolean;
  /** ¿Intentos agotados? */
  attemptsExhausted: boolean;
}

export interface UnlockContext {
  session: Session;
  /** true si es la primera sesión del curso (sin quiz previo). */
  isFirst: boolean;
  /** Estado del quiz de la sesión anterior (ignorado si isFirst). */
  prevQuiz?: PrevQuizState;
  /** ¿El diagnóstico inicial ya fue completado? */
  diagnosticDone: boolean;
  /** "Ahora" en ISO. */
  nowIso: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function sessionUnlockState(ctx: UnlockContext): SessionUnlockState {
  const { session, isFirst, prevQuiz, diagnosticDone, nowIso } = ctx;

  // Puerta de entrada: sin diagnóstico inicial, todo bloqueado.
  if (!diagnosticDone) {
    return {
      unlocked: false,
      reason: "diagnostic_pending",
      reasonLabel: "Completa el diagnóstico inicial para empezar",
    };
  }

  // Condición 1: fecha de liberación.
  const dateReached =
    !session.unlockDate ||
    new Date(session.unlockDate).getTime() <= new Date(nowIso).getTime();

  if (!dateReached) {
    return {
      unlocked: false,
      reason: "date",
      reasonLabel: `Disponible a partir del ${formatDate(session.unlockDate!)}`,
    };
  }

  // Condición 2: quiz previo resuelto (solo si no es la primera sesión).
  if (!isFirst && prevQuiz && prevQuiz.exists) {
    const resolved = prevQuiz.passed || prevQuiz.attemptsExhausted;
    if (!resolved) {
      return {
        unlocked: false,
        reason: "prev_quiz",
        reasonLabel: "Resuelve el quiz de la sesión anterior",
      };
    }
  }

  return { unlocked: true };
}
