import { cn } from "@/lib/cn";

/** Barra de progreso en lima sobre pista gris. */
export function ProgressBar({
  value,
  className,
}: {
  value: number; // 0–100
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-divider)]",
        className,
      )}
    >
      <div
        className="h-full rounded-[var(--radius-pill)] bg-[var(--color-lime)] transition-[width]"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** Anillo de progreso en lima. `dark` para usarse sobre banda navy. */
export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  dark = false,
  children,
}: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  dark?: boolean;
  children?: React.ReactNode;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.15)" : "var(--color-divider)"}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-lime)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset]"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
