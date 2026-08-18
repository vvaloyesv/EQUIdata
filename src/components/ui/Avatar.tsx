import { cn } from "@/lib/cn";

/** Avatar con iniciales (sin imágenes stock, coherente con la marca). */
export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--color-lavender)] font-display text-[var(--color-navy)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
