/**
 * Evaluación sin cronómetro (diagnósticos, onboarding de intereses): recibe
 * las respuestas completas, valida intentos, califica y guarda (Seguridad,
 * Fase 1 · SEC-01). La nota nunca la calcula el navegador.
 */

import { NextResponse } from "next/server";
import type { AnswerInput } from "@/lib/domain/types";
import { badRequest, errorResponse, readBody, sessionUserId, trustedRepository, unauthorized } from "@/lib/server/trusted";

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const { evaluationId, answers } = await readBody(request);
  if (typeof evaluationId !== "string" || !evaluationId) return badRequest("Falta la evaluación.");
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return badRequest("Faltan las respuestas.");
  }

  try {
    const result = await trustedRepository().submitAnswers(
      userId,
      evaluationId,
      answers as Record<string, AnswerInput>,
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
