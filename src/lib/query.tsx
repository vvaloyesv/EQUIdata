"use client";

/**
 * Caché de lecturas del repositorio (M10 · F5), sobre TanStack Query.
 *
 * Reemplaza a `useAsync`. Tres cosas cambian para la persona:
 * - Volver a una pantalla ya visitada muestra al instante lo último que se
 *   cargó (y lo refresca en segundo plano si tiene más de 30 s).
 * - El layout y las pantallas comparten lecturas con la misma clave (perfil,
 *   no leídos, dashboard…): se piden una vez, no una vez por componente.
 * - Después de guardar algo, `useRefresh()` vuelve a pedir en segundo plano
 *   sin borrar lo que está en pantalla — ya no se vuelve al esqueleto de
 *   carga (eso desmontaba el video/HTML del módulo y lo recargaba).
 *
 * Convención de claves: `[entidad, ...parámetros que la identifican]`, con
 * el id de usuario cuando el dato es personal. Ver `queryKeys` abajo.
 */

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // Sin refetch al volver a la pestaña: cuesta egress y la persona
            // no espera que la pantalla cambie sola.
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Lee datos del repositorio con caché. `loading` es true solo mientras no hay
 * nada que mostrar (primera carga); al refrescar, `data` se mantiene.
 */
export function useRepoQuery<T>(
  key: QueryKey,
  fn: () => Promise<T>,
  options: { enabled?: boolean; staleTime?: number } = {},
): { data: T | null; loading: boolean; error: unknown } {
  const enabled = options.enabled ?? true;
  const query = useQuery({
    queryKey: key,
    // TanStack no admite `undefined` como dato: se normaliza a null.
    queryFn: async () => (await fn()) ?? null,
    enabled,
    staleTime: options.staleTime,
  });
  if (query.error) console.error("[useRepoQuery]", key, query.error);
  return {
    data: (query.data as T | null | undefined) ?? null,
    loading: enabled && query.isPending,
    error: query.error,
  };
}

/**
 * Tras una escritura: marca todo como desactualizado y vuelve a pedir en
 * segundo plano lo que está en pantalla (lo demás, al volver a abrirlo).
 * Sin recargar la página ni mostrar el esqueleto de carga.
 */
export function useRefresh(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

/** Claves compartidas entre componentes — misma clave = misma lectura en caché. */
export const queryKeys = {
  studentProfile: (userId: string) => ["student-profile", userId] as const,
  unread: (userId: string) => ["unread", userId] as const,
  streak: (userId: string) => ["streak", userId] as const,
  dashboard: (userId: string) => ["dashboard", userId] as const,
  courseView: (userId: string, courseId: string) => ["course-view", userId, courseId] as const,
  communityFeed: (userId: string) => ["community-feed", userId] as const,
  conversations: (userId: string) => ["conversations", userId] as const,
  challenges: (userId: string) => ["challenges-view", userId] as const,
  moduleContent: (moduleId: string) => ["module-content", moduleId] as const,
  courses: () => ["courses"] as const,
  areaOptions: () => ["area-options"] as const,
  onboardingFields: () => ["onboarding-fields"] as const,
};
