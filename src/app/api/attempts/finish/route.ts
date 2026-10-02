/**
 * Califica y cierra un intento abierto con lo que se guardó (Seguridad, Fase 1).
 * Lo usa el final del quiz cronometrado y el cierre de intentos abandonados.
 * Idempotente: si ya estaba cerrado, devuelve la nota guardada.
 */

import { NextResponse } from "next/server";
import { badRequest, errorResponse, readBody, sessionUserId, trustedRepository, unauthorized } from "@/lib/server/trusted";
import { rateLimited } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const limited = await rateLimited("attempts:finish", userId);
  if (limited) return limited;
  const { attemptId } = await readBody(request);
  if (typeof attemptId !== "string" || !attemptId) return badRequest("Falta el intento.");

  try {
    return NextResponse.json(await trustedRepository().completeAttempt(userId, attemptId));
  } catch (error) {
    return errorResponse(error);
  }
}
