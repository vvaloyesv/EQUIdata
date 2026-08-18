import { cn } from "@/lib/cn";

/**
 * Tarjeta blanca sobre lienzo off-white. Elige UNA de: borde hairline O sombra
 * sutil (no ambas). Por defecto usa sombra sutil. `dark` la vuelve banda navy.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  dark?: boolean;
  bordered?: boolean;
}

export function Card({
  dark = false,
  bordered = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-6",
        dark
          ? "bg-[var(--color-navy)] text-white"
          : "bg-[var(--color-surface)]",
        !dark && bordered && "border border-[var(--color-divider)]",
        !dark && !bordered && "shadow-[0_1px_3px_rgba(25,41,98,0.06),0_8px_24px_-12px_rgba(25,41,98,0.10)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
