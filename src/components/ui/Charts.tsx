import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDayMonth } from "@/lib/dates";

/**
 * Firma visual de EQUIdata (design spec §11.4): la app enseña estadística,
 * así que muestra su información como gráficos pequeños y honestos. Todo en
 * HTML/CSS con una sola escala por gráfico; nada decorativo.
 */

// ─── Ruta del curso como histograma ─────────────────────────────────

export interface RouteBar {
  /** Id de la sesión: con `hrefFor`, cada barra lleva a su sesión. */
  id?: string;
  order: number;
  title: string;
  /** 0–100. */
  percent: number;
  /** Sesión que aún no se libera: barra vacía con su fecha debajo. */
  upcoming?: boolean;
  unlockDate?: string;
}

const shortDate = formatDayMonth;

/** Estado de la sesión en palabras, para la etiqueta de debajo de la barra. */
function barStatus(s: RouteBar): string {
  // Solo la fecha: "Se libera 28 SEP" no cabe bajo la barra en celular; el
  // borde punteado ya dice que falta liberarla (y el título lo explica).
  if (s.upcoming) return s.unlockDate ? shortDate(s.unlockDate) : "Sin liberar";
  if (s.percent >= 100) return "Completa";
  if (s.percent === 0) return "Sin empezar";
  return `${s.percent}%`;
}

/**
 * Una barra por sesión; la altura es el % hecho. Lima = sesión completa.
 * `labels="full"` escribe "Sesión 1 · Completa" debajo; `"compact"` deja
 * "S01" para espacios angostos. Con `hrefFor`, cada columna es un enlace.
 */
export function RouteHistogram({
  sessions,
  dark = false,
  height = 72,
  labels = "compact",
  hrefFor,
  className,
}: {
  sessions: RouteBar[];
  dark?: boolean;
  height?: number;
  labels?: "full" | "compact";
  hrefFor?: (s: RouteBar) => string | undefined;
  className?: string;
}) {
  if (sessions.length === 0) return null;
  return (
    <div className={cn("flex w-full gap-1.5", className)}>
      {sessions.map((s) => {
        const full = s.percent >= 100;
        const status = barStatus(s);
        const href = hrefFor?.(s);
        const name = `Sesión ${s.order}`;
        const content = (
          <>
            <div
              className={cn(
                "relative flex w-full items-end overflow-hidden rounded-t-[6px] transition-[filter]",
                s.upcoming
                  ? dark
                    ? "border border-dashed border-white/25"
                    : "border border-dashed border-[var(--color-hint)]"
                  : dark
                    ? "bg-white/10"
                    : "bg-[var(--color-divider)]",
                href && "group-hover:brightness-95",
              )}
              style={{ height }}
            >
              {!s.upcoming && (
                <div
                  className={cn(
                    "w-full rounded-t-[6px] transition-[height] duration-700 ease-out motion-reduce:transition-none",
                    full
                      ? "bg-[var(--color-lime)]"
                      : dark
                        ? "bg-[var(--color-lavender)]"
                        : "bg-[var(--color-lavender-text)]",
                  )}
                  style={{ height: `${Math.max(s.percent, s.percent > 0 ? 6 : 0)}%` }}
                />
              )}
            </div>
            {labels === "full" ? (
              <div className="mt-2 text-center leading-tight">
                <p
                  className={cn(
                    "truncate text-xs font-medium",
                    dark ? "text-white" : "text-[var(--color-navy)]",
                    href && "group-hover:underline",
                  )}
                >
                  {name}
                </p>
                <p
                  className={cn(
                    "mt-0.5 truncate font-mono text-[0.625rem] uppercase tracking-[0.06em] tabular-nums",
                    full && !s.upcoming
                      ? "text-[var(--color-lime-text)]"
                      : dark
                        ? "text-white/50"
                        : "text-[var(--color-muted)]",
                  )}
                >
                  {status}
                </p>
              </div>
            ) : (
              <p
                className={cn(
                  "mt-2 truncate text-center font-mono text-[0.625rem] uppercase tracking-[0.06em] tabular-nums",
                  dark ? "text-white/50" : "text-[var(--color-muted)]",
                )}
              >
                {s.upcoming && s.unlockDate ? shortDate(s.unlockDate) : `S${String(s.order).padStart(2, "0")}`}
              </p>
            )}
          </>
        );
        const title = `${name} · ${s.title} · ${status}`;
        return href ? (
          <Link
            key={s.order}
            href={href}
            title={title}
            aria-label={`${name}: ${s.title}. ${status}`}
            className="group flex min-w-0 flex-1 flex-col rounded-[6px] focus-ring"
          >
            {content}
          </Link>
        ) : (
          <div key={s.order} title={title} className="flex min-w-0 flex-1 flex-col" aria-label={`${name}: ${status}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

// ─── Notas como dot plot con umbral ──────────────────────────────────

export interface ScorePoint {
  id: string;
  /** 0–100. */
  value: number;
  label: string;
}

/**
 * Un punto por nota sobre un eje 0–100 %, con la línea de aprobación. Los
 * puntos bajo el umbral van en coral (el único uso del coral en la vista).
 */
export function ScoreStrip({
  points,
  threshold,
  className,
}: {
  points: ScorePoint[];
  threshold?: number;
  className?: string;
}) {
  const ticks = [0, 25, 50, 75, 100];
  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-12">
        {/* eje */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--color-divider)]" />
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-[calc(50%-4px)] h-2 w-px bg-[var(--color-hint)]/50"
            style={{ left: `${t}%` }}
          />
        ))}
        {threshold !== undefined && (
          <div
            className="absolute inset-y-0 w-px bg-[var(--color-navy)]"
            style={{ left: `${threshold}%` }}
            aria-hidden
          >
            <span className="absolute -top-0.5 left-1.5 whitespace-nowrap font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--color-navy)]">
              Aprueba {threshold}%
            </span>
          </div>
        )}
        {points.map((p, i) => {
          const below = threshold !== undefined && p.value < threshold;
          // Puntos iguales se apilan levemente para que no se tapen.
          const same = points.slice(0, i).filter((q) => Math.abs(q.value - p.value) < 2).length;
          return (
            <span
              key={p.id}
              title={`${p.label}: ${p.value}%`}
              className={cn(
                "absolute h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-white",
                below ? "bg-[var(--color-coral)]" : "bg-[var(--color-lime-text)]",
              )}
              style={{ left: `${Math.min(100, Math.max(0, p.value))}%`, top: `calc(50% - 6px - ${same * 7}px)` }}
            />
          );
        })}
      </div>
      <div className="relative mt-1 h-4">
        {ticks.map((t) => (
          <span
            key={t}
            className={cn(
              "absolute font-mono text-[0.625rem] tabular-nums text-[var(--color-muted)]",
              t === 0 ? "left-0" : t === 100 ? "right-0" : "-translate-x-1/2",
            )}
            style={t === 0 || t === 100 ? undefined : { left: `${t}%` }}
          >
            {t}%
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Logrado vs. esperado ─────────────────────────────────────────────

/** Barra horizontal de lo logrado con una marca vertical en el nivel esperado. */
export function TargetBar({
  achieved,
  expected,
  className,
}: {
  achieved: number;
  expected: number;
  className?: string;
}) {
  const met = achieved >= expected;
  return (
    <div className={cn("relative h-2.5 w-full rounded-full bg-[var(--color-divider)]", className)}>
      <div
        className={cn(
          "h-full rounded-full",
          met ? "bg-[var(--color-lime)]" : "bg-[var(--color-lavender-text)]",
        )}
        style={{ width: `${Math.min(100, Math.max(0, achieved))}%` }}
      />
      <div
        className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-[var(--color-navy)]"
        style={{ left: `calc(${Math.min(100, Math.max(0, expected))}% - 1px)` }}
        title={`Esperado ${expected}%`}
      />
    </div>
  );
}
