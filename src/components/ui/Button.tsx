import { cn } from "@/lib/cn";

/**
 * Botón pill. Un solo primario (navy) por vista; secundario ghost lavanda.
 * La lima jamás es botón (marca-elearning §3).
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]",
  secondary:
    "border border-[var(--color-navy)]/40 text-[var(--color-lavender-text)] hover:bg-[var(--color-lavender-tint)]",
  ghost:
    "text-[var(--color-lavender-text)] hover:bg-[var(--color-lavender-tint)]",
  danger:
    "bg-[var(--color-coral)] text-white hover:bg-[var(--color-coral-hover)]",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] px-5 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-ring",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
