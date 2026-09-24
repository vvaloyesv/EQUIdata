/**
 * Rol de la sesión (M10 · F2).
 *
 * El rol viaja dentro del token de acceso como claim `user_role`, lo agrega
 * el Custom Access Token Hook de Supabase (`supabase/migrations/0006_auth_hook.sql`).
 * Leerlo del token evita una consulta a `profiles` en cada navegación. Si el
 * hook todavía no está activado en el dashboard, el claim no existe y se cae
 * a la consulta de siempre — así la app funciona antes y después de activarlo.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/domain/types";

const ROLES: readonly Role[] = ["student", "teacher"];

export function roleFromClaims(claims: Record<string, unknown> | null | undefined): Role | null {
  const role = claims?.user_role;
  return typeof role === "string" && (ROLES as readonly string[]).includes(role)
    ? (role as Role)
    : null;
}

/** Decodifica (sin verificar) el payload de un JWT — solo para leer claims de una sesión recién emitida por Supabase. */
export function claimsFromAccessToken(accessToken: string | undefined): Record<string, unknown> | null {
  const payload = accessToken?.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")));
  } catch {
    return null;
  }
}

/** Rol desde los claims si existen; si no, desde `profiles` (una consulta). */
export async function resolveRole(
  supabase: SupabaseClient,
  userId: string,
  claims: Record<string, unknown> | null | undefined,
): Promise<Role | null> {
  const fromToken = roleFromClaims(claims);
  if (fromToken) return fromToken;
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return (data?.role as Role | undefined) ?? null;
}

export function homeForRole(role: Role | null): string {
  return role === "teacher" ? "/teacher/dashboard" : "/dashboard";
}
