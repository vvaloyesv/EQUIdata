/**
 * Punto único de acceso al repositorio.
 *
 * La app corre solo contra Supabase (M10: el modo mock salió de la
 * ejecución). Las pantallas siguen consumiendo la interfaz `Repository`, no
 * la implementación — `MockRepository` sigue existiendo para los tests y
 * como fuente del seed (`scripts/seed-supabase.ts`), pero nada de la app lo
 * instancia.
 */

import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase/SupabaseRepository";

let instance: SupabaseRepository | null = null;

export function getRepository(): Repository {
  if (!instance) instance = new SupabaseRepository();
  return instance;
}
