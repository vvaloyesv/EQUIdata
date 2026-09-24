"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { DevQuickLogin } from "@/components/auth/DevQuickLogin";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { features } from "@/lib/features";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Ingreso de un solo paso (M10 · F2): la persona escribe su correo y recibe
 * un código. Si la cuenta no existe, se crea al verificar el código y el
 * layout del estudiante pide completar el perfil (ProfileCompletionModal).
 * No hay que elegir entre "iniciar sesión" y "registrarse".
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const googleEnabled = features.googleAuth;

  async function continueWithGoogle() {
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(authErrorMessage(oauthError));
    // Si no hay error, el navegador ya está siendo redirigido a Google.
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) {
      setError("Escribe un correo válido, por ejemplo nombre@fundacionwwbcol.org");
      return;
    }

    setSending(true);
    setError(undefined);
    const { error: otpError } = await createClient().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setSending(false);
    if (otpError) {
      setError(authErrorMessage(otpError));
      return;
    }
    router.push(`/login/otp?email=${encodeURIComponent(address)}`);
  }

  return (
    <AuthShell
      step={1}
      title="Bienvenida a EQUIdata"
      subtitle="Ingresa con tu correo y te enviamos un código de acceso."
      helperText="Si es tu primera vez, después del código completarás tu perfil."
      hideStepper
    >
      <h2 className="font-display text-2xl text-[var(--color-navy)]">Ingresa a tu cuenta</h2>

      <form onSubmit={submit} className="mt-6 space-y-3.5">
        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          icon={Mail}
          placeholder="nombre@fundacionwwbcol.org"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Enviando código…" : "Enviar código de acceso"} <ArrowRight size={16} />
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-divider)]" />
            <span className="text-[var(--color-coral)]">◆</span>
            <div className="h-px flex-1 bg-[var(--color-divider)]" />
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-canvas)]"
          >
            <GoogleMark /> Continuar con Google
          </button>
        </>
      )}

      <p className="mt-4 text-center text-xs text-[var(--color-hint)]">
        Al continuar aceptas la Política de Privacidad de la Fundación.
      </p>

      {process.env.NODE_ENV === "development" && <DevQuickLogin />}
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
