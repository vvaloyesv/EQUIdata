"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getRepository } from "@/lib/data";
import { genId } from "@/lib/teacher/course";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageBody, PageHeader } from "@/components/ui/Page";

export default function NewCoursePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const id = genId("c");
    const certificateDescription = String(form.get("certificateDescription") ?? "").trim();
    const certificateDurationHoursRaw = String(form.get("certificateDurationHours") ?? "").trim();
    await getRepository().createCourse({
      id,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      certificateDescription: certificateDescription || undefined,
      certificateDurationHours: certificateDurationHoursRaw
        ? Number(certificateDurationHoursRaw)
        : undefined,
      published: form.get("published") === "on",
      enrollmentOpen: form.get("enrollmentOpen") === "on",
      teacherName: user?.displayName ?? "Profesora",
    });
    router.push(`/teacher/courses/${id}`);
  }

  return (
    <div>
      <PageHeader
        back={
          <Link href="/teacher/courses" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white">
            <ArrowLeft size={15} /> Cursos
          </Link>
        }
        eyebrow="Contenido · nuevo curso"
        title="Crear curso"
        description="Después de crearlo agregas sesiones, módulos y evaluaciones."
      />
      <PageBody width="reading">
      <Card bordered className="mt-6">
        <form onSubmit={submit} className="space-y-4">
          <Input id="title" name="title" label="Título" placeholder="Fundamentos de estadística" required />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description">
              <Label>Descripción</Label>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              placeholder="De qué trata el curso y a quién va dirigido."
              className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-hint)] focus-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="certificateDescription">
              <Label>Descripción del certificado (opcional)</Label>
            </label>
            <textarea
              id="certificateDescription"
              name="certificateDescription"
              rows={2}
              placeholder="Texto de logro que aparece en el certificado. Si lo dejas vacío, se usa la descripción del curso."
              className="w-full rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white p-3 text-sm text-[var(--color-navy)] placeholder:text-[var(--color-hint)] focus-ring"
            />
          </div>
          <Input
            id="certificateDurationHours"
            name="certificateDurationHours"
            label="Duración del certificado en horas (opcional)"
            type="number"
            min={0}
            step={0.5}
            placeholder="Ej. 4 — si lo dejas vacío, se calcula sumando la duración de los módulos"
          />
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-navy)]">
            <input type="checkbox" name="published" className="accent-[var(--color-navy)]" />
            Publicar de inmediato
          </label>
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-navy)]">
            <input
              type="checkbox"
              name="enrollmentOpen"
              defaultChecked
              className="accent-[var(--color-navy)]"
            />
            Inscripciones abiertas (cualquiera puede inscribirse)
          </label>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Creando…" : "Crear curso"} <ArrowRight size={16} />
          </Button>
        </form>
      </Card>
      </PageBody>
    </div>
  );
}
