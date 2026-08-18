"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseMode } from "@/lib/data/dataSource";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { loginAs } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  /** Cuando el correo no coincide con el modo elegido, ofrece cambiar de pestaña en vez de solo mostrar un error. */
  const [suggestedMode, setSuggestedMode] = useState<AuthMode | null>(null);

  async function emailAlreadyRegistered(candidate: string): Promise<boolean> {
    const res = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: candidate }),
    });
    if (!res.ok) throw new Error("No pudimos verificar el correo. Intenta de nuevo.");
    const { exists } = (await res.json()) as { exists: boolean };
    return exists;
  }

  async function continueWithGoogle() {
    if (isSupabaseMode()) {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) setError(oauthError.message);
      // Si no hay error, el navegador ya está siendo redirigido a Google.
      return;
    }
    // Atajo de la demo: Google entra siempre a la cuenta de estudiante (el
    // profesor ingresa con su correo específico, ver spec).
    await loginAs("u-student");
    router.push("/dashboard");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Escribe un correo válido");
      return;
    }

    if (isSupabaseMode()) {
      setSending(true);
      setError(undefined);
      setSuggestedMode(null);

      let exists: boolean;
      try {
        exists = await emailAlreadyRegistered(email);
      } catch (checkError) {
        setSending(false);
        setError(checkError instanceof Error ? checkError.message : "Error inesperado");
        return;
      }

      if (mode === "login" && !exists) {
        setSending(false);
        setError("No encontramos una cuenta con este correo.");
        setSuggestedMode("register");
        return;
      }
      if (mode === "register" && exists) {
        setSending(false);
        setError("Ya tienes una cuenta con este correo.");
        setSuggestedMode("login");
        return;
      }

      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        // Refuerzo del lado de Supabase, por si algo más llega a llamar
        // signInWithOtp saltándose el chequeo de arriba: en "login" nunca
        // debe crear una cuenta nueva.
        options: { shouldCreateUser: mode === "register" },
      });
      setSending(false);
      if (otpError) {
        setError(otpError.message);
        return;
      }
      router.push(`/login/otp?email=${encodeURIComponent(email)}&mode=${mode}`);
      return;
    }

    // Auth simulada: no se envía correo real; pasamos al paso del código.
    router.push(`/login/otp?email=${encodeURIComponent(email)}&mode=${mode}`);
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setSuggestedMode(null);
    setError(undefined);
  }

  const isRegister = mode === "register";

  return (
    <AuthShell
      step={1}
      title={isRegister ? "¡Súmate a EQUIdata!" : "Bienvenida de vuelta"}
      subtitle={
        isRegister
          ? "Crea tu cuenta para acceder a cursos, tutoriales y retos."
          : "Ingresa con tu correo institucional y continúa donde ibas."
      }
      helperText={
        isRegister
          ? "Después del código completaremos tu perfil para personalizar tu ruta."
          : "Sólo necesitamos confirmar tu código de acceso."
      }
      hideStepper={!isRegister}
    >
      {isRegister && (
        <Badge tone="coral" className="mb-3">
          Paso 1 de 3
        </Badge>
      )}
      <h2 className="font-display text-2xl text-[var(--color-navy)]">
        {isRegister ? "Crear cuenta" : "Iniciar sesión"}
      </h2>

      <div className="mt-5 grid grid-cols-2 rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-[var(--color-canvas)] p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`rounded-[var(--radius-pill)] px-3 py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-[var(--color-navy)] text-white"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`rounded-[var(--radius-pill)] px-3 py-2 text-sm font-medium transition-colors ${
            mode === "register"
              ? "bg-[var(--color-navy)] text-white"
              : "text-[var(--color-muted)] hover:text-[var(--color-navy)]"
          }`}
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3.5">
        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          icon={Mail}
          placeholder="nombre@fundacionwwbcol.org"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
            setSuggestedMode(null);
          }}
          error={error}
        />
        {suggestedMode && (
          <button
            type="button"
            onClick={() => switchMode(suggestedMode)}
            className="text-sm text-[var(--color-lavender-text)] hover:underline"
          >
            {suggestedMode === "register" ? "Ir a registrarme →" : "Ir a iniciar sesión →"}
          </button>
        )}
        <Button type="submit" className="w-full" disabled={sending}>
          {sending
            ? "Enviando…"
            : isRegister
              ? "Registrarme con código"
              : "Enviar código de acceso"}{" "}
          <ArrowRight size={16} />
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-divider)]" />
        <span className="text-[var(--color-coral)]">◆</span>
        <div className="h-px flex-1 bg-[var(--color-divider)]" />
      </div>

      <button
        onClick={continueWithGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-canvas)]"
      >
        <GoogleMark /> Continuar con Google
      </button>

      <p className="mt-4 text-center text-xs text-[var(--color-hint)]">
        Al continuar aceptas la Política de Privacidad de la Fundación.
      </p>
    </AuthShell>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
