"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Overlay + panel centrado. Primer modal genérico de la app — antes de esto
 * "agregar algo" siempre era inline en la misma pantalla; esto hacía falta
 * para "una mini pantalla que se agranda" (comunidad: post + respuestas).
 * Cierra con click afuera o Escape.
 */
export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-navy)]/40 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] bg-white p-6 shadow-[0_30px_80px_rgba(18,34,79,0.25)]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="float-right -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-navy)]"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
