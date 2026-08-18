import Image from "next/image";

/**
 * Logo real de EQUIdata (assets de marca).
 * - variant "color": logo positivo, para fondos claros.
 * - variant "white": monocromático negativo, para fondos navy.
 */
export function Logo({
  variant = "color",
  width = 180,
  className,
  priority = false,
}: {
  variant?: "color" | "white";
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  const src =
    variant === "white" ? "/brand/logo-negativo.png" : "/brand/logo-positivo.png";
  // Proporción del asset original ≈ 2172x724 → alto = ancho * 0.333
  const height = Math.round(width * 0.333);
  return (
    <Image
      src={src}
      alt="EQUIdata — Aprende. Analiza. Transforma."
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}

/**
 * Logo positivo (a color) sobre un contenedor blanco, para que se lea también
 * en fondos navy (el texto "EQUI" es navy). Es el tratamiento del mockup del
 * profesor: el logo a color en una tarjeta blanca sobre el sidebar oscuro.
 */
export function LogoLockup({
  width = 150,
  priority = false,
}: {
  width?: number;
  priority?: boolean;
}) {
  return (
    <span className="flex w-full items-center justify-center rounded-[var(--radius-token)] bg-white px-4 py-3">
      <Logo variant="color" width={width} priority={priority} />
    </span>
  );
}
