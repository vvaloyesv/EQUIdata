"use client";

/**
 * Autenticación.
 *
 * Bifurca internamente según `isSupabaseMode()` (ver `src/lib/data/dataSource.ts`)
 * para que el resto de la app (`useAuth()`, `useRequireAuth()`, los headers de
 * dashboard que llaman `logout()`) no necesite saber cuál de las dos fuentes
 * está activa:
 *
 * - **Mock** (por defecto): el "usuario logueado" vive en memoria del
 *   singleton `MockRepository` — comportamiento sin cambios respecto al MVP
 *   original. `loginAs(userId)` es la única forma de "entrar".
 * - **Supabase**: la sesión real vive en cookies (`@supabase/ssr`); este
 *   provider se suscribe a `onAuthStateChange` y arma el `User` a partir de
 *   la fila de `profiles`. El login real (OTP/Google) ya no pasa por
 *   `loginAs` — las páginas de login llaman directo al cliente de Supabase
 *   (ver `login/page.tsx`, `login/otp/page.tsx`) y este contexto reacciona
 *   solo a los cambios de sesión.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@/lib/domain/types";
import { getMockRepository } from "@/lib/data";
import { isSupabaseMode } from "@/lib/data/dataSource";
import { createClient } from "@/lib/supabase/client";

interface AuthValue {
  user: User | null;
  loading: boolean;
  /** Solo tiene efecto en modo mock — ver doc de arriba. */
  loginAs: (userId: string) => Promise<void>;
  logout: () => void;
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

function useMockAuth(): AuthValue {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const repo = getMockRepository();
    const u = await repo.getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Ambos hooks (mock/Supabase) se llaman siempre para respetar las reglas
    // de hooks — este solo hace trabajo real cuando el modo activo es mock.
    if (isSupabaseMode()) {
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  const loginAs = useCallback(
    async (userId: string) => {
      getMockRepository().setCurrentUser(userId);
      await load();
    },
    [load],
  );

  const logout = useCallback(() => {
    getMockRepository().setCurrentUser(null);
    setUser(null);
  }, []);

  return useMemo(() => ({ user, loading, loginAs, logout }), [user, loading, loginAs, logout]);
}

function useSupabaseAuth(): AuthValue {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Perezoso y condicionado al modo: `AuthProvider` llama este hook siempre
  // (reglas de hooks), incluso en modo mock o durante el prerender de
  // `next build` — construir el cliente ahí sin este guard revienta el build
  // en cuanto faltan `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` (p. ej. en Vercel
  // sin esas env vars configuradas), aunque la app esté en modo mock.
  const supabase = useMemo(() => (isSupabaseMode() ? createClient() : null), []);

  const loadProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, display_name, avatar_url, last_seen")
        .eq("id", userId)
        .single();
      if (error || !data) {
        setUser(null);
        return;
      }
      setUser(userFromProfileRow(data as ProfileRow));
    },
    [supabase],
  );

  useEffect(() => {
    // Ambos hooks (mock/Supabase) se llaman siempre para respetar las reglas
    // de hooks — este solo hace trabajo real (llamadas de red) cuando el
    // modo activo es Supabase.
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        void loadProfile(session.user.id).finally(() => active && setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void loadProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const loginAs = useCallback(async () => {
    // No aplica en modo Supabase: el login real pasa por
    // `supabase.auth.signInWithOtp/verifyOtp/signInWithOAuth` directamente
    // desde las páginas de login, no por aquí.
    console.warn("loginAs() no tiene efecto en modo Supabase.");
  }, []);

  const logout = useCallback(() => {
    void supabase?.auth.signOut();
    setUser(null);
  }, [supabase]);

  return useMemo(() => ({ user, loading, loginAs, logout }), [user, loading, loginAs, logout]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // El modo no cambia en caliente (viene de una env var evaluada en build) —
  // llamar siempre ambos hooks en el mismo orden es válido para las reglas
  // de hooks, solo se usa el resultado del modo activo.
  const mockAuth = useMockAuth();
  const supabaseAuth = useSupabaseAuth();
  const value = isSupabaseMode() ? supabaseAuth : mockAuth;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
