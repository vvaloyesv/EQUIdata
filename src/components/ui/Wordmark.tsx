import { cn } from "@/lib/cn";

/**
 * Wordmark minimalista: cuadro lima + "EQUIdata".
 * Es la marca de uso en producto (coherente con las pantallas de estudiante),
 * no el logotipo completo a color (que se reserva para material externo).
 */
export function Wordmark({
  className,
  onDark = true,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="h-3.5 w-3.5 rounded-[3px] bg-[var(--color-lime)]" />
      <span
        className={cn(
          "font-display text-lg tracking-tight",
          onDark ? "text-white" : "text-[var(--color-navy)]",
        )}
      >
        EQUIdata
      </span>
    </span>
  );
}
