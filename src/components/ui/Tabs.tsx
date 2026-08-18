"use client";

import { cn } from "@/lib/cn";

/** Tabs pill (p. ej. Video / Recurso HTML). Activo en navy sólido. */
export interface TabItem {
  id: string;
  label: React.ReactNode;
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-[var(--radius-pill)] bg-[var(--color-navy-tint)] p-1">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-1.5 text-sm font-medium transition-colors",
            active === it.id
              ? "bg-[var(--color-navy)] text-white"
              : "text-[var(--color-navy)] hover:bg-white/60",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
