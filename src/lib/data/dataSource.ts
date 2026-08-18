/**
 * El toggle acordado: `NEXT_PUBLIC_DATA_SOURCE=supabase` activa la base de
 * datos y autenticación reales; cualquier otro valor (o ausente) mantiene el
 * comportamiento de siempre (`MockRepository` + auth simulada). Import único
 * para que `AuthContext`, `middleware.ts` y `getRepository()` decidan igual.
 */
export function isSupabaseMode(): boolean {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";
}
