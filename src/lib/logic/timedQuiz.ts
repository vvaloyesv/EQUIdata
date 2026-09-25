/**
 * Quiz cronometrado (24/09/2026): una pregunta a la vez, 45 segundos cada
 * una, sin volver atrás.
 *
 * Aplica a los quizzes de sesión y de tutorial. Los diagnósticos y el
 * onboarding de intereses siguen con todas las preguntas juntas y sin tiempo.
 *
 * Un intento cronometrado se guarda al comenzar (`in_progress`) y cada
 * respuesta al pasar a la siguiente pregunta. Si la persona se sale o recarga
 * a mitad del quiz, ese intento cuenta como usado y se cierra con lo que
 * alcanzó a responder; la profesora puede reabrir un intento desde
 * Calificaciones.
 */

import type { Attempt, Evaluation } from "@/lib/domain/types";

export const QUESTION_SECONDS = 45;

/** ¿Esta evaluación se rinde en formato cronometrado? */
export function isTimedEvaluation(evaluation: Pick<Evaluation, "kind">): boolean {
  return evaluation.kind === "quiz" || evaluation.kind === "tutorial_quiz";
}

/**
 * Intentos cronometrados que quedaron abiertos: la persona empezó y no
 * terminó (se salió, recargó o se cortó la conexión). Al volver a entrar se
 * cierran con las respuestas guardadas.
 */
export function abandonedAttempts(attempts: Attempt[]): Attempt[] {
  return attempts.filter((a) => a.status === "in_progress");
}

/** Segundos que quedan (entero, nunca negativo) para una pregunta que vence en `deadlineMs`. */
export function secondsLeft(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

/** "0:45", "0:07" — para el contador. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
