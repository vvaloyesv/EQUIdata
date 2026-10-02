/**
 * Límites de frecuencia de las rutas /api/* (auditoría, Fase 2).
 *
 * Se cuenta por persona (id de la sesión, nunca uno que mande el navegador) y
 * por ruta, en ventanas fijas de un minuto, con el contador de Postgres de
 * `0011_rate_limits.sql`. Los topes están muy por encima del ritmo de una
 * persona usando la app: solo frenan scripts y bucles.
 *
 * Si el contador falla (base sin 0011, corte con Supabase) la petición pasa:
 * es preferible no frenar a nadie a dejar un quiz sin poder guardarse.
 */

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const RATE_LIMITS = {
  "attempts:start": { limit: 10, windowSeconds: 60 },
  "attempts:answer": { limit: 60, windowSeconds: 60 },
  "attempts:finish": { limit: 30, windowSeconds: 60 },
  "attempts:submit": { limit: 10, windowSeconds: 60 },
  "certificates:issue": { limit: 20, windowSeconds: 60 },
  "challenges:attempt": { limit: 20, windowSeconds: 60 },
  "profile:update": { limit: 10, windowSeconds: 60 },
  "grades:export": { limit: 20, windowSeconds: 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

type RpcClient = Pick<SupabaseClient, "rpc">;

let service: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  service ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return service;
}

/**
 * Suma una petición de `userId` a `bucket`. Devuelve la respuesta 429 lista
 * para retornar si pasó el tope, o `null` si puede seguir.
 */
export async function rateLimited(
  bucket: RateLimitBucket,
  userId: string,
  client: RpcClient = serviceClient(),
): Promise<NextResponse | null> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket];
  const { data, error } = await client.rpc("rate_limit_hit", {
    p_key: `${bucket}:${userId}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.warn("[rate-limit] sin contador, la petición pasa:", error.message);
    return null;
  }

  const retryAfter = Number(data) || 0;
  if (retryAfter <= 0) return null;
  return NextResponse.json(
    { error: "Hiciste demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
