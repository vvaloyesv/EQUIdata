"use client";

import { useRequireAuth } from "@/lib/useRequireAuth";
import { BrandLoader } from "@/components/ui/BrandLoader";

/**
 * Layout "focus": sin el sidebar grande de la app. Usado por las vistas de
 * contenido (curso/sesión, evaluación, tutorial) donde el video/HTML debe
 * ocupar casi toda la pantalla. La navegación vive en FocusTopBar, dentro de
 * cada página. Son vistas de estudiante — requieren sesión de ese rol.
 */
export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth("student");

  if (loading || !user) {
    return <BrandLoader fullScreen size="lg" label="Cargando contenido..." />;
  }

  return <div className="min-h-dvh bg-[var(--color-canvas)]">{children}</div>;
}
