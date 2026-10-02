import { Lock } from "lucide-react";
import { Label } from "./Label";

/** Estado bloqueado con candado y motivo específico (spec §5.5). */
export function LockedState({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--color-divider)] bg-[var(--color-canvas)] px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-divider)]">
        <Lock size={18} className="text-[var(--color-muted)]" />
      </div>
      <Label>Bloqueado</Label>
      <p className="max-w-xs text-sm text-[var(--color-muted)]">{reason}</p>
    </div>
  );
}

/**
 * Estado vacío: dice qué falta y lleva a la acción (auditoría §11.3). Tarjeta
 * blanca alineada a la izquierda, como el resto del contenido.
 */
export function EmptyState({
  title,
  hint,
  eyebrow,
  action,
}: {
  title: string;
  hint?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-6">
      {eyebrow && <Label>{eyebrow}</Label>}
      <p className="mt-1 font-display text-lg text-[var(--color-navy)]">{title}</p>
      {hint && <p className="mt-1.5 max-w-[60ch] text-sm text-[var(--color-muted)]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
