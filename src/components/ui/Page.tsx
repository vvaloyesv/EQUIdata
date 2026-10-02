import { cn } from "@/lib/cn";

/**
 * Plantillas de página (U2 · 24/09/2026, design spec §11.3). Todas las
 * pantallas con navegación usan el mismo borde izquierdo:
 *
 * - `PageHeader`: banda navy de sección (referente LAB10). Etiqueta mono en
 *   lima con un dato real, título grande en blanco y como máximo una acción.
 * - `PageBody`: el contenido debajo. `width="board"` para tableros, listas y
 *   tablas; `width="reading"` (720 px) para formularios y lectura.
 */

const CONTAINER = "mx-auto w-full max-w-[1200px] px-5 lg:px-10";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  back,
  children,
}: {
  /** Dato real en mono, p. ej. "3 CURSOS · 1 COMPLETO". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Una sola acción (botón o enlace) alineada a la derecha. */
  action?: React.ReactNode;
  /** Enlace de volver, arriba del título. */
  back?: React.ReactNode;
  /** Contenido extra dentro de la banda (p. ej. cifras o filtros). */
  children?: React.ReactNode;
}) {
  return (
    <header className="bg-[var(--color-navy)] text-white">
      <div className={cn(CONTAINER, "pb-8 pt-7 lg:pb-10 lg:pt-9")}>
        {back && <div className="mb-4 text-sm">{back}</div>}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && (
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-lime)]">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-balance font-display text-3xl leading-tight lg:text-[2.625rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-white/70">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </header>
  );
}

export function PageBody({
  width = "board",
  className,
  children,
}: {
  width?: "board" | "reading";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(CONTAINER, "py-8 lg:py-10")}>
      <div className={cn(width === "reading" && "max-w-[720px]", className)}>{children}</div>
    </div>
  );
}

/** Cifra dentro de la banda navy: número grande + etiqueta mono. */
export function BandStat({
  value,
  label,
  tone = "default",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "default" | "lime";
}) {
  return (
    <div>
      <div
        className={cn(
          "font-display text-3xl tabular-nums leading-none",
          tone === "lime" ? "text-[var(--color-lime)]" : "text-white",
        )}
      >
        {value}
      </div>
      <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/55">{label}</p>
    </div>
  );
}

/** Botón claro para la banda navy (la acción principal de la sección). */
export const bandActionClass =
  "inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-navy-tint)] active:scale-[0.98]";
