"use client";

import { use, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRepository } from "@/lib/data";
import { genId } from "@/lib/teacher/course";

function CreateQuiz({ courseId }: { courseId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("sessionId") ?? undefined;
  const created = useRef(false);

  useEffect(() => {
    if (created.current) return;
    created.current = true;

    (async () => {
      const repo = getRepository();
      const session = sessionId
        ? (await repo.listSessions(courseId)).find((s) => s.id === sessionId)
        : undefined;
      const modules = session ? await repo.listModules(session.id) : [];
      const id = genId("e");
      await repo.createEvaluation({
        id,
        courseId,
        sessionId,
        kind: "quiz",
        title: session ? `Quiz — ${session.title}` : "Nuevo quiz",
        maxAttempts: 2,
        waitHours: 0,
        passingScore: 80,
        isActive: true,
        placementAfterModuleId: modules[modules.length - 1]?.id,
      });
      router.replace(`/teacher/courses/${courseId}/quiz/${id}`);
    })();
  }, [courseId, sessionId, router]);

  return (
    <div className="p-8">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
    </div>
  );
}

export default function NewQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  return (
    <Suspense>
      <CreateQuiz courseId={courseId} />
    </Suspense>
  );
}
