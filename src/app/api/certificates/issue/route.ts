/**
 * Emite el certificado de un curso (Seguridad, Fase 1 · SEC-02). El servidor
 * calcula la elegibilidad con los datos reales (diagnóstico final aprobado +
 * curso completo) y arma el certificado él mismo: del navegador solo toma
 * qué curso. Si la persona aún no cumple, devuelve `certificate: null`.
 */

import { NextResponse } from "next/server";
import { getOrIssueCertificate } from "@/lib/student/certificate";
import { fromCertificate } from "@/lib/data/supabase/SupabaseRepository";
import { badRequest, errorResponse, readBody, sessionUserId, trustedRepository, unauthorized } from "@/lib/server/trusted";
import { rateLimited } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return unauthorized();
  const limited = await rateLimited("certificates:issue", userId);
  if (limited) return limited;
  const { courseId } = await readBody(request);
  if (typeof courseId !== "string" || !courseId) return badRequest("Falta el curso.");

  try {
    const certificate = await getOrIssueCertificate(
      trustedRepository(),
      userId,
      courseId,
      new Date().toISOString(),
    );
    return NextResponse.json({ certificate: certificate ? fromCertificate(certificate) : null });
  } catch (error) {
    return errorResponse(error);
  }
}
