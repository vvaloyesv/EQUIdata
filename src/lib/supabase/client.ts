/**
 * Cliente de Supabase para el navegador (Client Components).
 *
 * Toda la app sigue siendo client-side (ver contexto.md): las pantallas llaman
 * a `getRepository()` → `SupabaseRepository`, que usa este cliente. La sesión
 * vive en cookies (maneja `@supabase/ssr`), no en memoria como el mock.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
