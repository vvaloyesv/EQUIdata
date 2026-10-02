/**
 * Guarda la respuesta a una pregunta de un intento abierto (Seguridad, Fase 1).
 * Sin calificar: la nota se calcula al cerrar. En quiz cronometrado, cada
 * pregunta se acepta una sola vez y dentro de su tiempo (hora del servidor).
 */

import { NextResponse } from "next/server";
import type { AnswerInput } from "@/lib/domain/types";
import { badRequest, errorResponse, readBody, sessionUserId, trustedRepository, unauthorized } from "@/lib/server/trusted";

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const { attemptId, questionId, answer } = await readBody(request);
  if (typeof attemptId !== "string" || typeof questionId !== "string") {
    return badRequest("Faltan el intento o la pregunta.");
  }
  if (!answer || typeof answer !== "object") return badRequest("Falta la respuesta.");

  try {
    await trustedRepository().recordAttemptAnswer(userId, attemptId, questionId, answer as AnswerInput);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
