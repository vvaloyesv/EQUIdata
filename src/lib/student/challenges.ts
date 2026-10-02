/**
 * Ensambla la lista de retos para el estudiante junto con su propio mejor
 * intento (si ya jugó alguno). Un reto se puede reintentar: se guarda un
 * ChallengeAttempt por cada vez que el HTML reporta un resultado.
 */

import type { Repository } from "@/lib/data/repository";
import type { Challenge, ChallengeAttempt } from "@/lib/domain/types";
import { AttemptError } from "@/lib/student/attemptService";

export interface ChallengeVM {
  challenge: Challenge;
  attemptCount: number;
  bestAttempt: ChallengeAttempt | null;
}

export async function buildChallengesView(
  repo: Repository,
  userId: string,
): Promise<ChallengeVM[]> {
  const [challenges, attempts] = await Promise.all([
    repo.listChallenges(),
    repo.listChallengeAttempts(userId),
  ]);

  return challenges.map((challenge) => {
    const mine = attempts.filter((a) => a.challengeId === challenge.id);
    const bestAttempt = mine.reduce<ChallengeAttempt | null>((best, a) => {
      if (!best) return a;
      return a.score / a.total > best.score / best.total ? a : best;
    }, null);
    return { challenge, attemptCount: mine.length, bestAttempt };
  });
}

/**
 * Guarda el resultado de un reto (Seguridad · SEC-01, retos). Corre en
 * /api/challenges/attempt: quién, cuándo y el id los pone el servidor; del
 * navegador solo toma el reto y el puntaje que reportó su HTML, acotado a
 * 0 ≤ score ≤ total. El HTML del reto se autocalifica en el navegador, así
 * que el puntaje en sí no se puede verificar — solo que sea coherente.
 */
export async function recordChallengeAttempt(
  repo: Repository,
  userId: string,
  input: { challengeId: unknown; score: unknown; total: unknown },
  nowIso: string,
): Promise<ChallengeAttempt> {
  const { challengeId } = input;
  const score = Number(input.score);
  const total = Number(input.total);
  if (typeof challengeId !== "string" || !challengeId) {
    throw new AttemptError("Falta el reto.", 400);
  }
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(score)) {
    throw new AttemptError("El resultado del reto no es válido.", 400);
  }
  if (!(await repo.getChallenge(challengeId))) {
    throw new AttemptError("El reto no existe.", 404);
  }
  return repo.createChallengeAttempt({
    id: `cha-${crypto.randomUUID()}`,
    userId,
    challengeId,
    score: Math.max(0, Math.min(score, total)),
    total,
    completedAt: nowIso,
  });
}
