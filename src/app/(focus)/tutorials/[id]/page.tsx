"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { ModuleViewer } from "@/components/student/ModuleViewer";
import { FocusTopBar } from "@/components/student/FocusTopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function TutorialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);

  const { data, loading } = useAsync(async () => {
    const repo = getRepository();
    const tutorials = await repo.listTutorials();
    const tutorial = tutorials.find((t) => t.id === id) ?? null;
    if (!tutorial || !user) return null;
    const progress = await repo.listModuleProgress(user.id);
    const completed = progress.some((p) => p.moduleId === id && p.completed);
    const quiz = await repo.getTutorialQuiz(id);
    return { tutorial, completed, tutorials, quiz };
  }, [id, user?.id, reloadKey]);

  if (loading || !data?.tutorial) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { tutorial, completed, tutorials, quiz } = data;
  const idx = tutorials.findIndex((t) => t.id === id);
  const prev = idx > 0 ? tutorials[idx - 1] : undefined;
  const next = idx < tutorials.length - 1 ? tutorials[idx + 1] : undefined;

  async function complete() {
    if (!user) return;
    await getRepository().setModuleProgress({
      userId: user.id,
      moduleId: id,
      completed: true,
      completedAt: new Date().toISOString(),
    });
    setReloadKey((k) => k + 1);
  }

  return (
    <div>
      <FocusTopBar
        backHref="/tutorials"
        backLabel="Tutoriales"
        crumbs={[tutorial.title]}
        onPrev={prev ? () => router.push(`/tutorials/${prev.id}`) : undefined}
        onNext={next ? () => router.push(`/tutorials/${next.id}`) : undefined}
      />
      <div className="space-y-4 px-8 py-8">
        <ModuleViewer module={tutorial} completed={completed} onComplete={complete} />
        {quiz && (
          <Card
            bordered
            className="flex items-center justify-between gap-3 border-[var(--color-lavender)]"
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck size={20} className="text-[var(--color-lavender-text)]" />
              <p className="text-sm text-[var(--color-navy)]">
                Este tutorial tiene un quiz corto para poner a prueba lo aprendido.
              </p>
            </div>
            <Link href={`/tutorials/${id}/eval/${quiz.id}`}>
              <Button variant="secondary">Tomar quiz</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
