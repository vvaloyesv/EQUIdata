import { cn } from "@/lib/cn";
import { Label } from "./Label";

/**
 * Tile de métrica: tint de color + número grande + etiqueta mono debajo.
 * Usar tints con moderación (no efecto piñata): reservar coral para 1 dato hero.
 */
type Tint = "lime" | "coral" | "lavender" | "navy" | "plain";

const tints: Record<Tint, string> = {
  lime: "bg-[var(--color-lime-tint)]",
  coral: "bg-[var(--color-coral-tint)]",
  lavender: "bg-[var(--color-lavender-tint)]",
  navy: "bg-[var(--color-navy-tint)]",
  plain: "bg-[var(--color-surface)] border border-[var(--color-divider)]",
};

export function StatTile({
  value,
  label,
  tint = "plain",
  hint,
  className,
}: {
  value: React.ReactNode;
  label: string;
  tint?: Tint;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-5",
        tints[tint],
        className,
      )}
    >
      <div className="font-display tabular text-3xl text-[var(--color-navy)]">
        {value}
      </div>
      <div className="mt-1">
        <Label>{label}</Label>
      </div>
      {hint && (
        <div className="mt-2 text-xs text-[var(--color-muted)]">{hint}</div>
      )}
    </div>
  );
}
