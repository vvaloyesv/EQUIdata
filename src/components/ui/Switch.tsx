import { cn } from "@/lib/cn";

/** Toggle on/off. Track lima cuando está activo — mismo uso de "activo" que el ítem actual del sidebar. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-[var(--radius-pill)] transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[var(--color-lime)]" : "bg-[var(--color-divider)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(25,41,98,0.3)] transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
