"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { isTeacherEmail } from "@/lib/auth/teacherEmail";
import { isSupabaseMode } from "@/lib/data/dataSource";
import { createClient } from "@/lib/supabase/client";

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { loginAs } = useAuth();
  const email = params.get("email") ?? "tu correo";
  const mode = params.get("mode") === "register" ? "register" : "login";
  const isRegister = mode === "register";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const supabaseMode = isSupabaseMode();

  async function confirmCodeSupabase() {
    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (verifyError || !data.user) {
      setError(verifyError?.message ?? "Código inválido o vencido");
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "teacher") {
      router.push("/teacher/dashboard");
      return;
    }
    // Registro y login llegan siempre al dashboard — si el perfil quedó
    // incompleto (recién registrado, o una cuenta vieja sin documento), el
    // layout del estudiante se encarga de mostrar el modal de completar
    // datos encima (ver ProfileCompletionModal).
    router.push("/dashboard");
  }

  async function confirmCode() {
    if (submitting) return;
    if (code.length < 6) {
      setError("Ingresa los 6 dígitos");
      return;
    }
    setSubmitting(true);
    setError(undefined);

    if (supabaseMode) {
      await confirmCodeSupabase();
      return;
    }

    // En la demo (mock) aceptamos cualquier código de 6 dígitos. El correo
    // determina el rol (spec: el profesor es una cuenta específica, no un
    // conmutador manual). Cualquier otro correo entra a la cuenta de
    // estudiante de la demo.
    if (isTeacherEmail(email)) {
      await loginAs("u-teacher");
      router.push("/teacher/dashboard");
      return;
    }

    await loginAs("u-student");
    router.push("/dashboard");
  }

  async function resendCode() {
    if (!supabaseMode) return;
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      // Mismo refuerzo que el envío inicial (login/page.tsx): en modo
      // "login" nunca debe crear una cuenta nueva, ni siquiera vía reenvío.
      options: { shouldCreateUser: mode === "register" },
    });
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResent(true);
    setError(undefined);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void confirmCode();
  }

  useEffect(() => {
    if (code.length === 6 && !submitting) {
      void confirmCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, submitting]);

  return (
    <AuthShell
      step={1}
      title={isRegister ? "Confirma tu correo" : "Confirma que eres tú"}
      subtitle={
        isRegister
          ? "Escribe el código para crear tu cuenta y completar tu perfil."
          : "Escribe el código de 6 dígitos para entrar a tu cuenta."
      }
      hideStepper={!isRegister}
    >
      {isRegister && (
        <Badge tone="coral" className="mb-3">
          Paso 1 de 3
        </Badge>
      )}
      <h2 className="font-display text-2xl text-[var(--color-navy)]">
        Revisa tu correo
      </h2>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">
        Enviamos un código de 6 dígitos a{" "}
        <span className="font-medium text-[var(--color-navy)]">{email}</span>
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <OtpInput value={code} onChange={setCode} />
        {error && (
          <p className="text-xs text-[var(--color-coral)]">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Confirmando…" : "Confirmar código"} <ArrowRight size={16} />
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
        ¿No llegó el código?{" "}
        {supabaseMode ? (
          <button
            type="button"
            onClick={() => void resendCode()}
            className="text-[var(--color-lavender-text)] hover:underline"
          >
            {resent ? "Código reenviado" : "Reenviar código"}
          </button>
        ) : (
          <button className="text-[var(--color-lavender-text)] hover:underline">
            Reenviar código
          </button>
        )}
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
