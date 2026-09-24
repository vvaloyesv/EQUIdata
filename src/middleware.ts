/**
 * Protección de rutas server-side. `useRequireAuth` redirige recién después
 * de hidratar, dejando pasar el primer render sin ningún chequeo; aquí el
 * chequeo ocurre antes de que la página llegue al navegador.
 *
 * Corre en cada navegación, así que no debe consultar la base (M10 · F2):
 * `getClaims()` valida el token (localmente si el proyecto usa llaves de
 * firma asimétricas) y el rol viaja en el claim `user_role` que agrega el
 * Custom Access Token Hook. Si el hook aún no está activo, `resolveRole` cae
 * a una consulta a `profiles`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";
import { resolveRole } from "@/lib/auth/role";

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
  "/settings",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isStudentPath = matchesPrefix(pathname, STUDENT_PATHS);
  const isTeacherPath = pathname === "/teacher" || pathname.startsWith("/teacher/");

  if (!isStudentPath && !isTeacherPath) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = await resolveRole(supabase, userId, claims);
  if (isTeacherPath && role !== "teacher") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (isStudentPath && role !== "student") {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
