import { Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui/Logo";
import { Label } from "@/components/ui/Label";

/**
 * Shell del flujo de acceso: tarjeta blanca flotante sobre un fondo con glow
 * suave (lavanda/lima/coral, la paleta del logo). Arriba, un stepper
 * horizontal de 3 pasos. Debajo, dos columnas: logo + copy a la izquierda,
 * formulario a la derecha.
 *
 * Regla de marca (memoria "logo-positivo-grande"): logo positivo siempre,
 * grande, sin recuadro blanco, sobre un fondo que armoniza con su paleta.
 */

const STEPS = [
  { n: 1, label: "Ingresa" },
  { n: 2, label: "Tus datos" },
  { n: 3, label: "Listo" },
];

export function AuthShell({
  step,
  title,
  subtitle,
  helperText,
  compactStepper = false,
  hideStepper = false,
  children,
}: {
  step: 1 | 2 | 3;
  title: React.ReactNode;
  subtitle: string;
  /** Línea secundaria opcional, debajo del subtítulo (p. ej. el siguiente paso a dar). */
  helperText?: string;
  compactStepper?: boolean;
  hideStepper?: boolean;
  children: React.ReactNode;
}) {
  const steps = compactStepper ? STEPS.slice(0, 1) : STEPS;

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-4 md:p-6"
      style={{
        backgroundColor: "var(--color-canvas)",
        backgroundImage:
          "radial-gradient(circle at 12% 8%, rgba(190,164,232,0.30), transparent 42%), radial-gradient(circle at 92% 88%, rgba(187,239,127,0.30), transparent 46%), radial-gradient(circle at 90% 10%, rgba(213,89,71,0.16), transparent 36%)",
      }}
    >
      <div className="w-full max-w-6xl rounded-[28px] bg-white p-8 shadow-[0_1px_3px_rgba(25,41,98,0.06),0_24px_60px_-24px_rgba(25,41,98,0.20)] md:px-20 md:py-11">
        {/* Stepper horizontal */}
        {!hideStepper && (
        <ol className="mb-8 flex items-center justify-center gap-2.5">
          {steps.map((s, i) => {
            const done = s.n < step;
            const active = s.n === step;
            return (
              <li key={s.n} className="flex items-center gap-2.5">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                      done && "bg-[var(--color-lime)] text-[var(--color-navy)]",
                      active &&
                        "bg-[var(--color-lavender)] text-white",
                      !done &&
                        !active &&
                        "border border-[var(--color-divider)] bg-white text-[var(--color-hint)]",
                    )}
                  >
                    {done ? <Check size={14} /> : String(s.n).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "label-mono",
                      active ? "!text-[var(--color-navy)]" : "!text-[var(--color-hint)]",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="mb-3.5 h-px w-12 bg-[var(--color-divider)]" />
                )}
              </li>
            );
          })}
        </ol>
        )}

        {/* Cuerpo: logo + copy / formulario */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-20">
          <div className="flex flex-col items-center justify-center text-center">
            <Logo variant="color" width={185} priority />
            <h1 className="mt-5 font-display text-[32px] leading-tight text-[var(--color-navy)]">
              {title}
            </h1>
            <div className="my-4 h-1 w-10 rounded-full bg-[var(--color-coral)]" />
            <p className="text-[15px] text-[var(--color-muted)]">{subtitle}</p>
            {helperText && (
              <p className="mt-3 text-[15px] text-[var(--color-muted)]">
                {helperText}
              </p>
            )}
          </div>

          <div className="flex flex-col justify-center">{children}</div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5">
         </div>
      </div>
    </div>
  );
}
