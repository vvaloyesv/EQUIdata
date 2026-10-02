/**
 * Abre un intento cronometrado (Seguridad, Fase 1 · SEC-01). El servidor
 * valida que queden intentos y fija la hora de inicio: desde ahí corre el
 * tiempo de cada pregunta.
 */

import { NextResponse } from "next/server";
import { badRequest, errorResponse, readBody, sessionUserId, trustedRepository, unauthorized } from "@/lib/server/trusted";
import { rateLimited } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const limited = await rateLimited("attempts:start", userId);
  if (limited) return limited;
  const { evaluationId } = await readBody(request);
  if (typeof evaluationId !== "string" || !evaluationId) return badRequest("Falta la evaluación.");

  try {
    const attempt = await trustedRepository().beginAttempt(userId, evaluationId);
    return NextResponse.json({ attempt });
  } catch (error) {
    return errorResponse(error);
  }
}
