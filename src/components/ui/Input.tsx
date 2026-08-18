import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Label } from "./Label";

/** Input con borde hairline, foco anillo lavanda, error coral. Icono opcional a la izquierda. */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export function Input({
  label,
  error,
  icon: Icon,
  className,
  id,
  ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id}>
          <Label>{label}</Label>
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-lavender-text)]"
          />
        )}
        <input
          id={id}
          className={cn(
            "w-full rounded-[var(--radius-token)] border bg-white py-2.5 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-hint)] focus-ring",
            Icon ? "pl-10 pr-3.5" : "px-3.5",
            error
              ? "border-[var(--color-coral)]"
              : "border-[var(--color-divider)]",
            className,
          )}
          {...rest}
        />
      </div>
      {error && (
        <span className="text-xs text-[var(--color-coral)]">{error}</span>
      )}
    </div>
  );
}

type SelectOption = string | { value: string; label: string };

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  /** Cadena simple: mismo texto como value y como texto visible. Objeto: value distinto de la etiqueta (p. ej. un código con su descripción). */
  options: readonly SelectOption[];
  placeholder?: string;
  icon?: LucideIcon;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  icon: Icon,
  className,
  id,
  ...rest
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id}>
          <Label>{label}</Label>
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-lavender-text)]"
          />
        )}
        <select
          id={id}
          className={cn(
            "w-full appearance-none rounded-[var(--radius-token)] border bg-white py-2.5 pr-9 text-sm text-[var(--color-navy)] focus-ring",
            Icon ? "pl-10" : "px-3.5",
            error
              ? "border-[var(--color-coral)]"
              : "border-[var(--color-divider)]",
            className,
          )}
          {...(rest.value === undefined && rest.defaultValue === undefined
            ? { defaultValue: "" }
            : {})}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => {
            const value = typeof o === "string" ? o : o.value;
            const text = typeof o === "string" ? o : o.label;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        >
          <path
            d="M1 1.5L6 6.5L11 1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error && (
        <span className="text-xs text-[var(--color-coral)]">{error}</span>
      )}
    </div>
  );
}
