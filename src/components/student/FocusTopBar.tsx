import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronRight as Crumb } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Barra angosta de "modo enfocado" (patrón LAB10): breadcrumb compacto +
 * navegación Anterior/Siguiente. Reemplaza el sidebar grande de la app en las
 * vistas de contenido (curso, evaluación, tutorial) para dejarle el espacio
 * al video/HTML.
 */
export function FocusTopBar({
  backHref,
  backLabel,
  crumbs,
  onPrev,
  onNext,
  nextLabel = "Siguiente",
}: {
  backHref: string;
  backLabel: string;
  /** Migas de pan después del "volver"; la última se resalta como actual. */
  crumbs: string[];
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-[var(--color-navy)] px-6 py-3">
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm">
        <Link
          href={backHref}
          className="flex shrink-0 items-center gap-1 font-medium text-white hover:text-white/80"
        >
          <ChevronLeft size={15} /> {backLabel}
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            <Crumb size={13} className="shrink-0 text-white/30" />
            <span
              className={cn(
                "truncate",
                i === crumbs.length - 1
                  ? "font-medium text-white"
                  : "text-white/60",
              )}
            >
              {c}
            </span>
          </span>
        ))}
      </div>

      {(onPrev || onNext) && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-white/15 px-3.5 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-lime)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-lime)]/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextLabel} <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
