"use client";

import { useState } from "react";
import { CreditCard, User, Briefcase, LayoutGrid } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { CARGO_OPTIONS } from "@/lib/brand/lists";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";

type PrivacyKey =
  | "showNameInCommunity"
  | "notifyUnreadMessages"
  | "notifyStreakReminder";

export default function SettingsPage() {
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: areaOptions } = useAsync(
    () => getRepository().listAreaOptions(),
    [],
  );
  const { data: profile, loading } = useAsync(
    () =>
      user ? getRepository().getStudentProfile(user.id) : Promise.resolve(null),
    [user?.id, reloadKey],
  );

  async function submitAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const cedula = String(form.get("cedula") ?? "").trim();
    await getRepository().saveStudentProfile({
      ...profile,
      nombres: String(form.get("nombres") ?? ""),
      apellidos: String(form.get("apellidos") ?? ""),
      cedula: cedula || undefined,
      cargo: String(form.get("cargo") ?? ""),
      area: String(form.get("area") ?? ""),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setReloadKey((k) => k + 1);
  }

  async function togglePref(key: PrivacyKey, next: boolean) {
    if (!profile) return;
    await getRepository().saveStudentProfile({ ...profile, [key]: next });
    setReloadKey((k) => k + 1);
  }

  if (loading || !profile) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Label>Configuración</Label>
      <h1 className="mt-1 font-display text-3xl text-[var(--color-navy)]">
        Tu cuenta
      </h1>

      <Card bordered className="mt-6">
        <Label>Datos básicos</Label>

        <form onSubmit={submitAccount} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="nombres"
              name="nombres"
              label="Nombres"
              icon={User}
              defaultValue={profile.nombres}
              required
            />
            <Input
              id="apellidos"
              name="apellidos"
              label="Apellidos"
              icon={User}
              defaultValue={profile.apellidos}
              required
            />
          </div>

          <Input
            id="cedula"
            name="cedula"
            label="Cédula"
            icon={CreditCard}
            defaultValue={profile.cedula ?? ""}
            placeholder="Opcional"
          />

          <Select
            id="cargo"
            name="cargo"
            label="Cargo"
            icon={Briefcase}
            options={CARGO_OPTIONS}
            defaultValue={profile.cargo}
            required
          />

          <Select
            id="area"
            name="area"
            label="Área o programa"
            icon={LayoutGrid}
            options={areaOptions ?? []}
            defaultValue={profile.area}
            required
          />

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
            {saved && (
              <span className="text-sm text-[var(--color-lime-text)]">
                Guardado.
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card bordered id="privacidad" className="mt-6 scroll-mt-8">
        <Label>Privacidad y notificaciones</Label>

        <div className="mt-2 divide-y divide-[var(--color-divider)]">
          <SettingRow
            title="Mostrar mi nombre en Comunidad"
            description={
              <>
                Si lo apagas, tus publicaciones y respuestas se muestran como{" "}
                &ldquo;Estudiante EQUIdata&rdquo; en vez de tu nombre.
              </>
            }
            checked={profile.showNameInCommunity !== false}
            onChange={(v) => togglePref("showNameInCommunity", v)}
          />
          <SettingRow
            title="Avisarme de mensajes sin leer"
            description="Muestra el contador en Mensajes y la campana del dashboard."
            checked={profile.notifyUnreadMessages !== false}
            onChange={(v) => togglePref("notifyUnreadMessages", v)}
          />
          <SettingRow
            title="Recordarme mi racha"
            description="Muestra un aviso en el dashboard cuando llevas días seguidos activa."
            checked={profile.notifyStreakReminder !== false}
            onChange={(v) => togglePref("notifyStreakReminder", v)}
          />
        </div>
      </Card>
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-navy)]">{title}</p>
        <p className="mt-0.5 text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
