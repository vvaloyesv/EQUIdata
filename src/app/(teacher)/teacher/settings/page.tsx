"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { CARGO_OPTIONS } from "@/lib/brand/lists";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  OnboardingFieldForm,
  type OnboardingFieldSubmitData,
} from "@/components/teacher/OnboardingFieldForm";

function OptionsCard({
  title,
  hint,
  options,
  onAdd,
  onRemove,
  editable = true,
}: {
  title: string;
  hint: string;
  options: string[];
  onAdd?: (value: string) => void;
  onRemove?: (value: string) => void;
  editable?: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <Card bordered>
      <Label>{title}</Label>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <span
            key={o}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--color-lavender-tint)] py-1 pl-2.5 pr-1.5 text-xs font-medium text-[var(--color-lavender-text)]"
          >
            {o}
            {editable && onRemove && (
              <button
                onClick={() => onRemove(o)}
                className="rounded-full p-0.5 hover:bg-[var(--color-lavender)]/30"
                aria-label={`Quitar ${o}`}
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}
      </div>
      {editable && onAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="mt-4 flex gap-2"
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Agregar opción…"
            className="flex-1"
          />
          <Button type="submit" className="!px-4 !py-2 text-sm">
            Agregar
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function TeacherSettingsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [addingField, setAddingField] = useState(false);
  const { data: areaOptions } = useAsync(
    () => getRepository().listAreaOptions(),
    [reloadKey],
  );
  const { data: onboardingFields } = useAsync(
    () => getRepository().listOnboardingFields(),
    [reloadKey],
  );

  async function addField(data: OnboardingFieldSubmitData) {
    await getRepository().createOnboardingField({
      id: `field-${crypto.randomUUID()}`,
      order: (onboardingFields?.length ?? 0) + 1,
      ...data,
    });
    setAddingField(false);
    setReloadKey((k) => k + 1);
  }

  async function removeField(id: string) {
    await getRepository().removeOnboardingField(id);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Label>Configuración</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Listas del onboarding
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Estas opciones aparecen en el formulario de perfil que completan los
        estudiantes al ingresar por primera vez. Agrega o quita lo que
        necesites.
      </p>

      <div className="mt-6 space-y-4">
        <OptionsCard
          title="Cargo"
          hint="Lista definitiva — no se edita desde aquí."
          options={[...CARGO_OPTIONS]}
          editable={false}
        />
        <OptionsCard
          title="Área o programa"
          hint="Agrega o quita las áreas o programas de la Fundación."
          options={areaOptions ?? []}
          onAdd={async (v) => {
            await getRepository().addAreaOption(v);
            setReloadKey((k) => k + 1);
          }}
          onRemove={async (v) => {
            await getRepository().removeAreaOption(v);
            setReloadKey((k) => k + 1);
          }}
        />

        <Card bordered>
          <Label>Campos personalizados</Label>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Agrega preguntas propias al onboarding (texto libre o lista de
            opciones), sin depender de un cambio de código.
          </p>

          {onboardingFields && onboardingFields.length > 0 && (
            <div className="mt-3 space-y-2">
              {onboardingFields.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-token)] border border-[var(--color-divider)] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-navy)]">
                      {f.label}
                    </p>
                    {f.type === "select" && f.options && (
                      <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                        {f.options.join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="lavender">
                      {f.type === "text" ? "Texto libre" : "Lista"}
                    </Badge>
                    <button
                      onClick={() => removeField(f.id)}
                      className="rounded-full p-1 text-[var(--color-hint)] hover:bg-[var(--color-coral-tint)] hover:text-[var(--color-coral)]"
                      aria-label={`Quitar ${f.label}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            {addingField ? (
              <OnboardingFieldForm onSubmit={addField} onCancel={() => setAddingField(false)} />
            ) : (
              <Button variant="secondary" onClick={() => setAddingField(true)}>
                + Agregar campo
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
