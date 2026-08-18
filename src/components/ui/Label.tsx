import { cn } from "@/lib/cn";

/** Etiqueta / microcopy en mono MAYÚSCULA — la firma anti-genérico. */
export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("label-mono", className)}>{children}</span>;
}
