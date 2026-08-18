import { cn } from "@/lib/cn";

/** Avatar con foto real si hay `avatarUrl`; si no, iniciales (sin imágenes stock, coherente con la marca). */
export function Avatar({
  name,
  avatarUrl,
  size = 40,
  className,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage (o data URL en mock), no un asset estático local.
      <img
        src={avatarUrl}
        alt={name}
        className={cn("inline-block shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

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
