"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Label } from "@/components/ui/Label";

interface DevAccount {
  email: string;
  role: string;
  displayName: string;
}

/**
 * Panel de acceso rápido — SOLO desarrollo (M10 · F1b). Entra con un clic
 * como cualquier cuenta existente, con sesión real de Supabase y sin correo.
 * Se muestra solo si `/api/dev/login` responde (en producción es 404, y este
 * componente ni siquiera se incluye: el padre lo renderiza solo cuando
 * `process.env.NODE_ENV === "development"`).
 */
export function DevQuickLogin() {
  const [accounts, setAccounts] = useState<DevAccount[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/dev/login")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setAccounts(body?.accounts ?? null))
      .catch(() => setAccounts(null));
  }, []);

  async function enter(email: string) {
    setPending(email);
    setError(undefined);
    const res = await fetch("/api/dev/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(null);
      setError(body.error ?? "No se pudo entrar");
      return;
    }
    // Recarga completa: la sesión quedó en cookies del lado del servidor y
    // el cliente de Supabase del navegador la lee al arrancar.
    window.location.assign(body.destination);
  }

  if (!accounts || accounts.length === 0) return null;

  return (
    <div className="mt-6 rounded-[var(--radius-token)] border border-dashed border-[var(--color-lavender)] bg-[var(--color-lavender-tint)] p-3">
      <div className="flex items-center gap-1.5">
        <Zap size={12} className="text-[var(--color-lavender-text)]" />
        <Label>Acceso rápido · solo desarrollo</Label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={pending !== null}
            onClick={() => void enter(a.email)}
            title={a.email}
            className="rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-white px-3 py-1.5 text-xs text-[var(--color-navy)] transition-colors hover:border-[var(--color-navy)] disabled:opacity-50"
          >
            {pending === a.email ? "Entrando…" : a.displayName}
            <span className="ml-1.5 text-[var(--color-hint)]">
              {a.role === "teacher" ? "profesora" : "estudiante"}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-[var(--color-coral)]">{error}</p>}
    </div>
  );
}
