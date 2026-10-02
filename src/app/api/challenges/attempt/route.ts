/**
 * Guarda el resultado de un reto (Seguridad · SEC-01, retos). La estudiante
 * ya no escribe en challenge_attempts: el servidor toma su id de la sesión,
 * verifica que el reto exista y acota el puntaje al total.
 */

import { NextResponse } from "next/server";
import { recordChallengeAttempt } from "@/lib/student/challenges";
import { fromChallengeAttempt } from "@/lib/data/supabase/SupabaseRepository";
import { errorResponse, readBody, sessionUserId, trustedRepository, unauthorized } from "@/lib/server/trusted";
import { rateLimited } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const limited = await rateLimited("challenges:attempt", userId);
  if (limited) return limited;
  const { challengeId, score, total } = await readBody(request);

  try {
    const attempt = await recordChallengeAttempt(
      trustedRepository(),
      userId,
      { challengeId, score, total },
      new Date().toISOString(),
    );
    return NextResponse.json({ attempt: fromChallengeAttempt(attempt) });
  } catch (error) {
    return errorResponse(error);
  }
}
