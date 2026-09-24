"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/authErrors";
import { claimsFromAccessToken, homeForRole, resolveRole } from "@/lib/auth/role";

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  /** Último código enviado solo al completar los 6 dígitos — evita reenviarlo en bucle si Supabase lo rechaza. */
  const autoSubmittedCode = useRef<string | null>(null);

  async function confirmCode() {
    if (submitting) return;
    if (code.length < 6) {
      setError("Ingresa los 6 dígitos");
      return;
    }
    setSubmitting(true);
    setError(undefined);

    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (verifyError || !data.user) {
      setError(authErrorMessage(verifyError));
      setSubmitting(false);
      return;
    }

    // Cuenta nueva o perfil incompleto: el layout del estudiante muestra el
    // formulario de perfil encima del dashboard (ProfileCompletionModal).
    const role = await resolveRole(
      supabase,
      data.user.id,
      claimsFromAccessToken(data.session?.access_token),
    );
    router.replace(homeForRole(role));
  }

  async function resendCode() {
    const { error: resendError } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (resendError) {
      setError(authErrorMessage(resendError));
      return;
    }
    setResent(true);
    setError(undefined);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void confirmCode();
  }

  // Envío automático al completar los 6 dígitos, una sola vez por código:
  // si Supabase lo rechaza, no se reintenta hasta que la persona lo edite o
  // pulse "Confirmar código".
  useEffect(() => {
    if (code.length === 6 && autoSubmittedCode.current !== code) {
      autoSubmittedCode.current = code;
      void confirmCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <AuthShell
      step={1}
      title="Confirma que eres tú"
      subtitle="Escribe el código de 6 dígitos que te enviamos por correo."
      hideStepper
    >
      <h2 className="font-display text-2xl text-[var(--color-navy)]">Revisa tu correo</h2>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">
        Enviamos un código de 6 dígitos a{" "}
        <span className="font-medium text-[var(--color-navy)]">{email || "tu correo"}</span>
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <OtpInput value={code} onChange={setCode} />
        {error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Confirmando…" : "Confirmar código"} <ArrowRight size={16} />
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
        ¿No llegó el código? Revisa la carpeta de spam o{" "}
        <button
          type="button"
          onClick={() => void resendCode()}
          className="text-[var(--color-lavender-text)] hover:underline"
        >
          {resent ? "código reenviado" : "pide uno nuevo"}
        </button>
      </p>
    </AuthShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
