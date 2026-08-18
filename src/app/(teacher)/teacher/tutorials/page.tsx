"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Video, FileCode2, ClipboardCheck } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildTeacherTutorialsView } from "@/lib/teacher/tutorials";
import { genId } from "@/lib/teacher/course";
import { toEmbedVideoUrl } from "@/lib/video";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ModuleForm } from "@/components/teacher/ModuleForm";
import type { Module, ModuleType } from "@/lib/domain/types";

export default function TeacherTutorialsPage() {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [addingTutorial, setAddingTutorial] = useState(false);

  const { data: tutorials, loading } = useAsync(
    () => buildTeacherTutorialsView(getRepository()),
    [reloadKey],
  );

  if (loading || !tutorials) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  async function addTutorial(data: {
    type: ModuleType;
    title: string;
    description: string;
    videoUrl?: string;
    contentHtml?: string;
    durationMin: number;
  }) {
    const repo = getRepository();
    await repo.createModule({
      id: genId("tut"),
      sessionId: null,
      context: "tutorial",
      order: (tutorials?.length ?? 0) + 1,
      ...data,
      videoUrl: data.videoUrl ? toEmbedVideoUrl(data.videoUrl) : data.videoUrl,
    });
    setAddingTutorial(false);
    setReloadKey((k) => k + 1);
  }

  async function createQuiz(tutorial: Module) {
    const repo = getRepository();
    const id = genId("e");
    await repo.createEvaluation({
      id,
      kind: "tutorial_quiz",
      tutorialModuleId: tutorial.id,
      title: `Quiz — ${tutorial.title}`,
      maxAttempts: 2,
      waitHours: 0,
      passingScore: 80,
      isActive: true,
    });
    router.push(`/teacher/tutorials/${tutorial.id}/quiz/${id}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Label>Contenido</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Tutoriales
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
        Mini módulos sueltos (video o HTML), fuera de la jerarquía de cursos.
        Opcionalmente pueden tener un quiz corto con % de aprobación.
      </p>

      <div className="mt-6 space-y-3">
        {tutorials.map(({ tutorial, quiz }) => {
          const Icon = tutorial.type === "video" ? Video : FileCode2;
          return (
            <Card key={tutorial.id} bordered>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-[var(--color-lavender-text)]" />
                    <Label>
                      {tutorial.type === "video" ? "Video" : "HTML"} ·{" "}
                      {tutorial.durationMin ?? 10} min
                    </Label>
                  </div>
                  <h3 className="mt-1.5 font-display text-lg text-[var(--color-navy)]">
                    {tutorial.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {tutorial.description}
                  </p>
                </div>
                <div className="shrink-0">
                  {quiz ? (
                    <Link href={`/teacher/tutorials/${tutorial.id}/quiz/${quiz.id}`}>
                      <Badge tone="lavender">
                        <ClipboardCheck size={12} /> Quiz · editar
                      </Badge>
                    </Link>
                  ) : (
                    <Button
                      variant="secondary"
                      className="!px-3.5 !py-1.5 text-xs"
                      onClick={() => createQuiz(tutorial)}
                    >
                      <ClipboardCheck size={13} /> Crear quiz
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {tutorials.length === 0 && !addingTutorial && (
          <p className="text-sm text-[var(--color-hint)]">
            Sin tutoriales todavía.
          </p>
        )}
      </div>

      <div className="mt-6">
        {addingTutorial ? (
          <ModuleForm onSubmit={addTutorial} onCancel={() => setAddingTutorial(false)} />
        ) : (
          <button
            onClick={() => setAddingTutorial(true)}
            className="text-sm text-[var(--color-lavender-text)] hover:underline"
          >
            + Agregar tutorial
          </button>
        )}
      </div>
    </div>
  );
}
