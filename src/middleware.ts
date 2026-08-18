/**
 * Protección de rutas server-side (solo aplica en modo Supabase — en modo
 * mock la sesión vive en memoria del cliente y este middleware no puede
 * verla, así que no hace nada; `useRequireAuth` sigue siendo el único gate
 * en ese modo, igual que hoy).
 *
 * Reemplaza la ausencia total de protección server-side de antes: hoy
 * `useRequireAuth` redirige recién después de hidratar, dejando pasar el
 * primer render sin ningún chequeo. Aquí el chequeo ocurre antes de que la
 * página llegue al navegador.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";
import { isSupabaseMode } from "@/lib/data/dataSource";

const STUDENT_PATHS = [
  "/dashboard",
  "/courses",
  "/calendar",
  "/projects",
  "/community",
  "/messages",
  "/challenges",
  "/tutorials",
  "/certifications",
];

/** Requiere sesión, sin exigir un rol específico (perfil aún incompleto). */
const AUTH_ONLY_PATHS = ["/onboarding"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  if (!isSupabaseMode()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isStudentPath = matchesPrefix(pathname, STUDENT_PATHS);
  const isTeacherPath = pathname === "/teacher" || pathname.startsWith("/teacher/");
  const isAuthOnlyPath = matchesPrefix(pathname, AUTH_ONLY_PATHS);

  if (!isStudentPath && !isTeacherPath && !isAuthOnlyPath) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isStudentPath || isTeacherPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (isTeacherPath && role !== "teacher") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isStudentPath && role !== "student") {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
