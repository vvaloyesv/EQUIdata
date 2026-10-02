/**
 * Piezas comunes de las rutas que escriben datos sensibles (Seguridad, Fase 1).
 *
 * - `sessionUserId()`: quién llama, leído de SU sesión (cookies), nunca de un
 *   id que mande el navegador.
 * - `trustedRepository()`: repositorio con la service role. Solo existe en el
 *   servidor; la clave nunca llega al navegador.
 * - `errorResponse()`: traduce los errores de negocio a su código HTTP.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { SupabaseRepository } from "@/lib/data/supabase/SupabaseRepository";
import { AttemptError } from "@/lib/student/attemptService";

export async function sessionUserId(): Promise<string | null> {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function trustedRepository(): SupabaseRepository {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return new SupabaseRepository(client, { trusted: true });
}

export function unauthorized() {
  return NextResponse.json({ error: "Tu sesión expiró. Vuelve a ingresar." }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function errorResponse(error: unknown) {
  if (error instanceof AttemptError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api] error inesperado", error);
  return NextResponse.json(
    { error: "No se pudo completar la acción. Intenta de nuevo." },
    { status: 500 },
  );
}

/** Lee el cuerpo JSON; si no es un objeto, devuelve uno vacío. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}
