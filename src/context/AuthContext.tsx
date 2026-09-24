"use client";

/**
 * Autenticación (Supabase Auth).
 *
 * La sesión real vive en cookies (`@supabase/ssr`). Este provider escucha
 * `onAuthStateChange` — que al suscribirse emite `INITIAL_SESSION` con la
 * sesión actual — y arma el `User` desde la fila de `profiles`. Es la única
 * fuente: no hay un `getSession()` inicial aparte que duplique la consulta.
 *
 * Dos reglas (M10 · F2):
 * - `loading` vale true mientras se resuelve el perfil de una sesión nueva,
 *   así `useRequireAuth` nunca ve "sin usuario" entre el código OTP y la
 *   carga del perfil (antes eso podía devolver a /login).
 * - Las consultas a Supabase se difieren fuera del callback de
 *   `onAuthStateChange`: la documentación de Supabase advierte que llamarlas
 *   dentro puede bloquear el lock de sesión.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/client";

interface AuthValue {
  user: User | null;
  loading: boolean;
  logout: () => void;
  /** Vuelve a leer el usuario actual sin recargar la página — para reflejar un cambio (nombre, foto) hecho mientras ya se está usando la app. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

interface ProfileRow {
  id: string;
  email: string;
  role: User["role"];
  display_name: string;
  avatar_url: string | null;
  last_seen: string | null;
}

function userFromProfileRow(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    lastSeen: row.last_seen ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  /** Usuario cuya sesión ya se está atendiendo — evita recargar el perfil en cada refresco de token. */
  const sessionUserId = useRef<string | null>(null);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, display_name, avatar_url, last_seen")
        .eq("id", userId)
        .single();
      // Si mientras tanto cambió la sesión (logout, otra cuenta), descartar.
      if (sessionUserId.current !== userId) return;
      setUser(error || !data ? null : userFromProfileRow(data as ProfileRow));
    },
    [supabase],
  );

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextId = session?.user?.id ?? null;

      if (!nextId) {
        sessionUserId.current = null;
        queryClient.clear();
        setUser(null);
        setLoading(false);
        return;
      }
      // TOKEN_REFRESHED y similares del mismo usuario: el perfil no cambió.
      if (nextId === sessionUserId.current && event !== "USER_UPDATED") return;

      // Otra cuenta en la misma pestaña: nada de la caché anterior le pertenece.
      if (sessionUserId.current && sessionUserId.current !== nextId) queryClient.clear();
      sessionUserId.current = nextId;
      setLoading(true);
      setTimeout(() => {
        void loadProfile(nextId).finally(() => {
          if (sessionUserId.current === nextId) setLoading(false);
        });
      }, 0);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase, loadProfile, queryClient]);

  const logout = useCallback(() => {
    sessionUserId.current = null;
    queryClient.clear();
    setUser(null);
    void supabase.auth.signOut();
  }, [supabase, queryClient]);

  const refreshUser = useCallback(async () => {
    if (sessionUserId.current) await loadProfile(sessionUserId.current);
  }, [loadProfile]);

  const value = useMemo(
    () => ({ user, loading, logout, refreshUser }),
    [user, loading, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
