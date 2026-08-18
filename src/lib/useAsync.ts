"use client";

import { useEffect, useState } from "react";

/**
 * Carga datos async del repositorio y re-ejecuta cuando cambian las deps
 * (p. ej. el usuario al conmutar de rol). Devuelve { data, loading, error }.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList,
): { data: T | null; loading: boolean; error: unknown } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn().then(
      (res) => {
        if (alive) {
          setData(res);
          setLoading(false);
        }
      },
      (err) => {
        if (alive) {
          console.error("[useAsync]", err);
          setError(err);
          setLoading(false);
        }
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
