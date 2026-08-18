"use client";

/**
 * Ventana emergente de "completa tus datos", pregunta a pregunta.
 *
 * Reemplaza la vieja página `/onboarding` (un solo formulario largo) y sirve
 * para dos casos con la misma UI:
 * 1. Estudiante recién registrado — llega directo a `/dashboard` y ve esto
 *    encima, sin nada llenado.
 * 2. Cuenta vieja con datos incompletos (p. ej. sin documento — ver
 *    `isProfileIncomplete`) — mismo modal, pero con lo que ya tenga guardado
 *    precargado, así solo confirma/completa lo que falta.
 *
 * No se puede cerrar ni saltar mientras falte algo obligatorio — el
 * `(student)/layout.tsx` que lo monta no le da ninguna vía de escape.
 */

import { useState } from "react";
import { ArrowLeft, ArrowRight, Briefcase, CreditCard, LayoutGrid, User } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { CARGO_OPTIONS } from "@/lib/brand/lists";
import { DOCUMENT_TYPE_OPTIONS, isPendingDocumentNumber, validateDocumentNumber } from "@/lib/brand/documentTypes";
import type { StudentProfile } from "@/lib/domain/types";

interface FormState {
  nombres: string;
  apellidos: string;
  cargo: string;
  area: string;
  documentType: string;
  documentNumber: string;
  customFields: Record<string, string>;
}

function initialFormState(profile: StudentProfile | null): FormState {
  return {
    nombres: profile?.nombres ?? "",
    apellidos: profile?.apellidos ?? "",
    cargo: profile?.cargo ?? "",
    area: profile?.area ?? "",
    documentType: profile?.documentType ?? "",
    documentNumber:
      profile && !isPendingDocumentNumber(profile.documentNumber) ? profile.documentNumber : "",
    customFields: profile?.customFields ?? {},
  };
}

export function ProfileCompletionModal({
  userId,
  profile,
  onComplete,
}: {
  userId: string;
  profile: StudentProfile | null;
  onComplete: () => void;
}) {
  const { data: areaOptions } = useAsync(() => getRepository().listAreaOptions(), []);
  const { data: customFieldDefs } = useAsync(() => getRepository().listOnboardingFields(), []);

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState<FormState>(() => initialFormState(profile));

  const steps = [
    { key: "name" as const, title: "¿Cuáles son tus nombres y apellidos?" },
    { key: "cargo" as const, title: "¿Cuál es tu cargo?" },
    { key: "area" as const, title: "¿En qué área o programa trabajas?" },
    { key: "document" as const, title: "Tu documento de identidad" },
    ...(customFieldDefs && customFieldDefs.length > 0
      ? [{ key: "custom" as const, title: "Un par de preguntas más" }]
      : []),
  ];
  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function validateStep(): string | null {
    switch (current.key) {
      case "name":
        if (!form.nombres.trim() || !form.apellidos.trim()) {
          return "Escribe tus nombres y apellidos.";
        }
        return null;
      case "cargo":
        return form.cargo ? null : "Selecciona tu cargo.";
      case "area":
        return form.area ? null : "Selecciona tu área o programa.";
      case "document":
        return validateDocumentNumber(form.documentType, form.documentNumber);
      case "custom":
        for (const f of customFieldDefs ?? []) {
          if (!form.customFields[f.id]?.trim()) return `Completa "${f.label}".`;
        }
        return null;
    }
  }

  async function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(undefined);

    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    setSaving(true);
    try {
      await getRepository().saveStudentProfile({
        userId,
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        cargo: form.cargo,
        area: form.area,
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
        customFields: Object.keys(form.customFields).length ? form.customFields : undefined,
        completed: true,
        showNameInCommunity: profile?.showNameInCommunity,
        notifyUnreadMessages: profile?.notifyUnreadMessages,
        notifyStreakReminder: profile?.notifyStreakReminder,
      });
      await getRepository().updateDisplayName(userId, `${form.nombres} ${form.apellidos}`.trim());
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    setError(undefined);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-navy)]/60 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-[0_24px_60px_-24px_rgba(25,41,98,0.4)]">
        <div className="mb-6 flex gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIndex ? "bg-[var(--color-lime)]" : "bg-[var(--color-divider)]"
              }`}
            />
          ))}
        </div>

        <p className="label-mono text-[var(--color-lavender-text)]">
          PREGUNTA {stepIndex + 1} DE {steps.length}
        </p>
        <h2 className="mt-1.5 font-display text-2xl leading-tight text-[var(--color-navy)]">
          {current.title}
        </h2>

        <div className="mt-5 space-y-3">
          {current.key === "name" && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="nombres"
                label="Nombres"
                icon={User}
                value={form.nombres}
                onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))}
                autoFocus
              />
              <Input
                id="apellidos"
                label="Apellidos"
                icon={User}
                value={form.apellidos}
                onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
              />
            </div>
          )}

          {current.key === "cargo" && (
            <Select
              id="cargo"
              label="Cargo"
              icon={Briefcase}
              options={CARGO_OPTIONS}
              placeholder="Selecciona tu cargo"
              value={form.cargo}
              onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            />
          )}

          {current.key === "area" && (
            <Select
              id="area"
              label="Área o programa"
              icon={LayoutGrid}
              options={areaOptions ?? []}
              placeholder="Selecciona tu área"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            />
          )}

          {current.key === "document" && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                id="documentType"
                label="Tipo de documento"
                icon={CreditCard}
                options={DOCUMENT_TYPE_OPTIONS}
                placeholder="Tipo"
                value={form.documentType}
                onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
              />
              <Input
                id="documentNumber"
                label="Número"
                icon={CreditCard}
                value={form.documentNumber}
                onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
              />
            </div>
          )}

          {current.key === "custom" &&
            (customFieldDefs ?? []).map((f) =>
              f.type === "select" ? (
                <Select
                  key={f.id}
                  id={`custom_${f.id}`}
                  label={f.label}
                  options={f.options ?? []}
                  placeholder="Selecciona una opción"
                  value={form.customFields[f.id] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customFields: { ...prev.customFields, [f.id]: e.target.value },
                    }))
                  }
                />
              ) : (
                <Input
                  key={f.id}
                  id={`custom_${f.id}`}
                  label={f.label}
                  value={form.customFields[f.id] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customFields: { ...prev.customFields, [f.id]: e.target.value },
                    }))
                  }
                />
              ),
            )}

          {error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-navy)]"
            >
              <ArrowLeft size={15} /> Atrás
            </button>
          ) : (
            <span />
          )}
          <Button onClick={goNext} disabled={saving}>
            {saving ? "Guardando…" : isLast ? "Terminar" : "Siguiente"} <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
