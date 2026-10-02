import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui/Logo";

/**
 * Shell del flujo de acceso (U5 · 24/09/2026). Pantalla dividida y plana:
 * a la izquierda el logo positivo grande y el tagline como pieza tipográfica;
 * a la derecha el formulario. Sin fondos difuminados (marca §4, auditoría §11.2).
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
    <div className="grid min-h-dvh bg-[var(--color-canvas)] lg:grid-cols-[1.05fr_1fr]">
      {/* Marca */}
      <section className="flex flex-col justify-between gap-6 border-b border-[var(--color-divider)] bg-white px-6 py-6 sm:gap-8 sm:px-10 sm:py-8 lg:border-b-0 lg:border-r lg:px-16 lg:py-14">
        <Logo variant="color" width={196} priority />
        <div>
          {/* En celular va en una línea para que el formulario quede a la vista. */}
          <p className="font-display text-2xl leading-[1.05] text-[var(--color-navy)] sm:text-6xl lg:text-7xl [&_br]:hidden sm:[&_br]:inline">
            Aprende.
            <br />{" "}
            Analiza.
            <br />{" "}
            Transforma<span className="text-[var(--color-coral)]">.</span>
          </p>
          <p className="mt-6 hidden max-w-sm text-sm leading-relaxed text-[var(--color-muted)] sm:block">
            Estadística aplicada a estudios del desarrollo y género, con datos reales de los
            programas de la Fundación.
          </p>
        </div>
        <p className="hidden font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-muted)] lg:block">
          Fundación WWB Colombia · Uso interno
        </p>
      </section>

      {/* Formulario */}
      <section className="flex items-start px-6 py-8 sm:items-center sm:px-10 sm:py-10 lg:px-16">
        <div className="w-full max-w-md">
          {!hideStepper && (
            <ol className="mb-8 flex items-center gap-2.5">
              {steps.map((s, i) => {
                const done = s.n < step;
                const active = s.n === step;
                return (
                  <li key={s.n} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs",
                        done && "bg-[var(--color-lime)] text-[var(--color-navy)]",
                        active && "bg-[var(--color-navy)] text-white",
                        !done && !active && "border border-[var(--color-divider)] bg-white text-[var(--color-hint)]",
                      )}
                    >
                      {done ? <Check size={14} /> : String(s.n).padStart(2, "0")}
                    </span>
                    <span className={cn("label-mono", active ? "!text-[var(--color-navy)]" : "!text-[var(--color-hint)]")}>
                      {s.label}
                    </span>
                    {i < steps.length - 1 && <span className="h-px w-8 bg-[var(--color-divider)]" />}
                  </li>
                );
              })}
            </ol>
          )}

          <h1 className="text-balance font-display text-3xl leading-tight text-[var(--color-navy)]">{title}</h1>
          <p className="mt-2 text-[15px] text-[var(--color-muted)]">{subtitle}</p>
          {helperText && <p className="mt-1 text-sm text-[var(--color-hint)]">{helperText}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
