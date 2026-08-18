"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, User, Briefcase, LayoutGrid } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CARGO_OPTIONS } from "@/lib/brand/lists";
import { getRepository } from "@/lib/data";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const { data: areaOptions } = useAsync(() => getRepository().listAreaOptions(), []);
  const { data: customFields } = useAsync(
    () => getRepository().listOnboardingFields(),
    [],
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const uid = user.id;
    const customValues: Record<string, string> = {};
    for (const field of customFields ?? []) {
      customValues[field.id] = String(form.get(`custom_${field.id}`) ?? "");
    }
    await getRepository().saveStudentProfile({
      userId: uid,
      nombres: String(form.get("nombres") ?? ""),
      apellidos: String(form.get("apellidos") ?? ""),
      cargo: String(form.get("cargo") ?? ""),
      area: String(form.get("area") ?? ""),
      customFields: Object.keys(customValues).length ? customValues : undefined,
      completed: true,
    });
    router.push("/dashboard");
  }

  return (
    <AuthShell
      step={2}
      title="Cuéntanos quién eres"
      subtitle="Queremos saber más de ti"
    >
      <Badge tone="coral" className="mb-3">
        Paso 2 de 3
      </Badge>
      <h2 className="font-display text-2xl text-[var(--color-navy)]">
        Tu perfil
      </h2>
      <p className="mt-1.5 text-sm text-[var(--color-muted)]">
        Con estos datos personalizamos tu ruta y tu certificado.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input id="nombres" name="nombres" label="Nombres" icon={User} placeholder="Valentina" required />
          <Input id="apellidos" name="apellidos" label="Apellidos" icon={User} placeholder="Mendoza" required />
        </div>
        <Select
          id="cargo"
          name="cargo"
          label="Cargo"
          icon={Briefcase}
          options={CARGO_OPTIONS}
          placeholder="Selecciona tu cargo"
          required
        />
        <Select
          id="area"
          name="area"
          label="Área o programa"
          icon={LayoutGrid}
          options={areaOptions ?? []}
          placeholder="Selecciona tu área"
          required
        />
        {(customFields ?? []).map((field) =>
          field.type === "select" ? (
            <Select
              key={field.id}
              id={`custom_${field.id}`}
              name={`custom_${field.id}`}
              label={field.label}
              options={field.options ?? []}
              placeholder={`Selecciona una opción`}
              required
            />
          ) : (
            <Input
              key={field.id}
              id={`custom_${field.id}`}
              name={`custom_${field.id}`}
              label={field.label}
              required
            />
          ),
        )}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Guardando…" : "Continuar"} <ArrowRight size={16} />
        </Button>
      </form>
    </AuthShell>
  );
}
