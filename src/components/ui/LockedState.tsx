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

/** Estado vacío genérico (0% de progreso, sin datos aún). */
export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-[var(--radius-card)] border border-dashed border-[var(--color-divider)] px-6 py-10 text-center">
      <p className="font-display text-[var(--color-navy)]">{title}</p>
      {hint && <p className="max-w-xs text-sm text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
