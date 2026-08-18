/**
 * Punto único de selección del repositorio.
 *
 * Decide entre MockRepository y SupabaseRepository según el toggle
 * `NEXT_PUBLIC_DATA_SOURCE` (ver `dataSource.ts`) — y NADA más de la app
 * cambia, porque todas las pantallas consumen la interfaz Repository, no la
 * implementación.
 */

import type { Repository } from "./repository";
import { MockRepository } from "./mock/MockRepository";
import { SupabaseRepository } from "./supabase/SupabaseRepository";
import { isSupabaseMode } from "./dataSource";

let mockInstance: MockRepository | null = null;
let supabaseInstance: SupabaseRepository | null = null;

export function getRepository(): Repository {
  if (isSupabaseMode()) {
    if (!supabaseInstance) supabaseInstance = new SupabaseRepository();
    return supabaseInstance;
  }
  if (!mockInstance) mockInstance = new MockRepository();
  return mockInstance;
}

/**
 * Acceso a la instancia mock concreta (para el AuthContext: cambiar de
 * usuario). Solo tiene sentido en modo mock — `AuthContext` solo la llama
 * desde su rama mock, nunca en modo Supabase.
 */
export function getMockRepository(): MockRepository {
  if (!mockInstance) mockInstance = new MockRepository();
  return mockInstance;
}
