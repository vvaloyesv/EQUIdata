import { cn } from "@/lib/cn";

/**
 * Estado de sesión/curso. Lima = completado/activo; navy-tint = neutro;
 * coral = alerta/riesgo; gris = bloqueado. Texto siempre en navy sobre claros.
 */
type Tone = "lime" | "neutral" | "coral" | "locked" | "lavender";

const tones: Record<Tone, string> = {
  lime: "bg-[var(--color-lime-tint)] text-[var(--color-lime-text)]",
  neutral: "bg-[var(--color-navy-tint)] text-[var(--color-navy)]",
  coral: "bg-[var(--color-coral-tint)] text-[var(--color-coral)]",
  locked: "bg-[var(--color-divider)] text-[var(--color-muted)]",
  lavender: "bg-[var(--color-lavender-tint)] text-[var(--color-lavender-text)]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
