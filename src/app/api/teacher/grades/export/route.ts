/**
 * Exportar calificaciones a CSV, del lado del servidor.
 *
 * GET /api/teacher/grades/export?courseId=…&evaluationId=…
 *
 * Qué gana esto frente a armar el archivo en el navegador:
 * - La autorización se decide aquí: sin sesión de profesora → 401/403,
 *   antes de leer un solo dato. Además, cada lectura pasa por la RLS de
 *   Supabase con la sesión de quien pide (no se usa la service role).
 * - La pantalla ya no contiene la lógica de exportación, y queda un único
 *   punto donde agregar, por ejemplo, un registro de quién exportó qué.
 * - Las celdas se neutralizan contra inyección de fórmulas (ver grades-csv).
 *
 * Lo que no cambia: el archivo termina en el computador de la profesora, que
 * es el objetivo; y la tabla de calificaciones sigue mostrando esos datos a
 * quien ya tiene permiso de verlos.
 */

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { resolveRole } from "@/lib/auth/role";
import { SupabaseRepository } from "@/lib/data/supabase/SupabaseRepository";
import { buildGradesView, gradesCsvFromView } from "@/lib/teacher/grades";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const courseId = params.get("courseId");
  const evaluationId = params.get("evaluationId");
  if (!courseId || !evaluationId) {
    return NextResponse.json({ error: "Falta el curso o la evaluación." }, { status: 400 });
  }

  const supabase = await createRouteHandlerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) {
    return NextResponse.json({ error: "Tu sesión terminó. Vuelve a ingresar." }, { status: 401 });
  }
  if ((await resolveRole(supabase, userId, data?.claims)) !== "teacher") {
    return NextResponse.json({ error: "Solo la profesora puede exportar calificaciones." }, { status: 403 });
  }

  try {
    const vm = await buildGradesView(
      new SupabaseRepository(supabase),
      courseId,
      evaluationId,
      new Date().toISOString(),
    );
    if (vm.evaluation.courseId && vm.evaluation.courseId !== courseId) {
      return NextResponse.json({ error: "La evaluación no pertenece a ese curso." }, { status: 400 });
    }
    const { csv, filename } = gradesCsvFromView(vm);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.startsWith("Evaluación no encontrada") ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? "No encontramos esa evaluación." : "No se pudo generar el archivo. Intenta de nuevo." },
      { status },
    );
  }
}
