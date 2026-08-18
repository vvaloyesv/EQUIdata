/**
 * Ensambla la lista de retos para el estudiante junto con su propio mejor
 * intento (si ya jugó alguno). Un reto se puede reintentar: se guarda un
 * ChallengeAttempt por cada vez que el HTML reporta un resultado.
 */

import type { Repository } from "@/lib/data/repository";
import type { Challenge, ChallengeAttempt } from "@/lib/domain/types";

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
