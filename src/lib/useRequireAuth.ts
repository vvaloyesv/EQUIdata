"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/domain/types";

/**
 * Protege una vista: sin sesión, manda a /login. Si se exige un rol y el
 * usuario logueado es del otro rol, lo manda a SU propio dashboard (el
 * profesor y el estudiante ya no comparten un conmutador manual — spec: el
 * profesor es una cuenta específica determinada en el login).
 */
export function useRequireAuth(requiredRole?: Role) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requiredRole && user.role !== requiredRole) {
      router.replace(user.role === "teacher" ? "/teacher/dashboard" : "/dashboard");
    }
  }, [loading, user, requiredRole, router]);

  return { user, loading };
}
