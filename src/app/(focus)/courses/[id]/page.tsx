"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Award, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { queryKeys, useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import {
  buildCourseView,
  flatUnlockedModules,
  withModuleCompleted,
  type CourseVM,
} from "@/lib/student/course";
import { moduleContentQuery } from "@/components/student/ModuleViewer";
import { LockedState } from "@/components/ui/LockedState";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CourseSidebar } from "@/components/student/CourseSidebar";
import { ModuleViewer } from "@/components/student/ModuleViewer";
import { FocusTopBar } from "@/components/student/FocusTopBar";

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const router = useRouter();
  const requestedModuleId = useSearchParams().get("module") ?? undefined;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refresh = useRefresh();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  const [selectedModuleId, setSelectedModuleId] = useState<string>();
  const userId = user?.id ?? "";
  const courseKey = queryKeys.courseView(userId, courseId);

  const { data: vm, loading } = useRepoQuery(
    courseKey,
    () => buildCourseView(getRepository(), userId, courseId, new Date().toISOString()),
    { enabled: !!user },
  );

  // Mientras se ve un módulo, se precarga el HTML del siguiente: al pulsar
  // "Siguiente clase" ya está en caché y aparece sin espera.
  useEffect(() => {
    if (!vm || !selectedModuleId) return;
    const flat = flatUnlockedModules(vm);
    const next = flat[flat.findIndex((i) => i.module.id === selectedModuleId) + 1]?.module;
    if (next?.type === "html") void queryClient.prefetchQuery(moduleContentQuery(next.id));
  }, [vm, selectedModuleId, queryClient]);

  // Selecciona la sesión y el módulo por defecto cuando cargan los datos.
  // `?module=<id>` (p. ej. desde "En repaso" del dashboard) abre ese módulo
  // si su sesión está abierta; si no, cae a la sesión por defecto.
  useEffect(() => {
    if (!vm) return;
    if (!selectedSessionId || !vm.sessions.some((s) => s.session.id === selectedSessionId)) {
      const requested = requestedModuleId
        ? vm.sessions.find(
            (s) => s.status !== "locked" && s.modules.some((m) => m.id === requestedModuleId),
          )
        : undefined;
      if (requested) {
        setSelectedSessionId(requested.session.id);
        setSelectedModuleId(requestedModuleId);
      } else {
        setSelectedSessionId(vm.defaultSessionId);
      }
    }
  }, [vm, selectedSessionId, requestedModuleId]);

  const activeSession = vm?.sessions.find(
    (s) => s.session.id === selectedSessionId,
  );

  useEffect(() => {
    if (!activeSession) return;
    const stillValid = activeSession.modules.some(
      (m) => m.id === selectedModuleId,
    );
    if (!stillValid) {
      const firstIncomplete = activeSession.modules.find(
        (m) => !activeSession.completedModuleIds.has(m.id),
      );
      setSelectedModuleId((firstIncomplete ?? activeSession.modules[0])?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.session.id]);

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const activeModule = activeSession?.modules.find(
    (m) => m.id === selectedModuleId,
  );

  const flat = flatUnlockedModules(vm);
  const flatIndex = flat.findIndex((i) => i.module.id === selectedModuleId);
  const prevItem = flatIndex > 0 ? flat[flatIndex - 1] : undefined;
  const nextItem =
    flatIndex >= 0 && flatIndex < flat.length - 1 ? flat[flatIndex + 1] : undefined;

  function goTo(item: { sessionId: string; module: { id: string } }) {
    setSelectedSessionId(item.sessionId);
    setSelectedModuleId(item.module.id);
  }

  /** Contenido secuencial: al completar, avanza al siguiente módulo, quiz o sesión. */
  async function completeAndAdvance(moduleId: string) {
    if (!user || !vm || !activeSession) return;
    // La pantalla se actualiza al instante sobre la caché; el servidor
    // confirma en segundo plano. Nada se desmonta: el siguiente video/HTML
    // aparece sin pasar por el esqueleto de carga.
    queryClient.setQueryData<CourseVM | null>(courseKey, (prev) =>
      prev ? withModuleCompleted(prev, moduleId) : prev,
    );
    void getRepository()
      .setModuleProgress({
        userId: user.id,
        moduleId,
        completed: true,
        completedAt: new Date().toISOString(),
      })
      .finally(() => refresh());

    const modules = activeSession.modules;
    const idx = modules.findIndex((m) => m.id === moduleId);
    const nextInSession = modules[idx + 1];

    if (nextInSession) {
      setSelectedModuleId(nextInSession.id);
      return;
    }

    // Último módulo de la sesión: ¿hay quiz pendiente?
    if (activeSession.quizEvaluation && !activeSession.quizGate?.passed) {
      router.push(`/courses/${courseId}/eval/${activeSession.quizEvaluation.id}`);
      return;
    }

    // Si no, pasa a la siguiente sesión (si ya está desbloqueada).
    const sessionIdx = vm.sessions.findIndex(
      (s) => s.session.id === activeSession.session.id,
    );
    const next = vm.sessions[sessionIdx + 1];
    if (next && next.status !== "locked") {
      setSelectedSessionId(next.session.id);
      setSelectedModuleId(undefined);
    } else if (!next && vm.finalDiagnosticAvailable && vm.diagnosticFinal) {
      router.push(`/courses/${courseId}/eval/${vm.diagnosticFinal.id}`);
    }
  }

  return (
    <div>
      <FocusTopBar
        backHref="/courses"
        backLabel="Mis cursos"
        crumbs={[vm.course.title, activeSession?.session.title ?? ""].filter(Boolean)}
        onPrev={prevItem ? () => goTo(prevItem) : undefined}
        onNext={nextItem ? () => goTo(nextItem) : undefined}
        nextLabel="Siguiente clase"
      />

      <div className="px-8 py-6">
        {!vm.diagnosticDone && vm.diagnosticInitial ? (
          <div>
            <LockedState reason="Completa el diagnóstico inicial para desbloquear el curso." />
            <Link href={`/courses/${courseId}/eval/${vm.diagnosticInitial.id}`}>
              <span className="mt-3 inline-block rounded-[var(--radius-pill)] bg-[var(--color-navy)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-navy-hover)]">
                Empezar diagnóstico inicial
              </span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {vm.interestOnboarding && !vm.interestOnboardingDone && (
              <Card
                bordered
                className="flex items-center justify-between gap-3 border-[var(--color-lavender)]"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-[var(--color-lavender-text)]" />
                  <p className="text-sm text-[var(--color-navy)]">
                    Cuéntanos tus intereses en este curso.
                  </p>
                </div>
                <Link href={`/courses/${courseId}/eval/${vm.interestOnboarding.id}`}>
                  <Button variant="secondary">Empezar</Button>
                </Link>
              </Card>
            )}
            {vm.certificateEligible && (
              <Card
                bordered
                className="flex items-center justify-between gap-3 border-[var(--color-lime)]"
              >
                <div className="flex items-center gap-3">
                  <Award size={20} className="text-[var(--color-lime-text)]" />
                  <p className="text-sm text-[var(--color-navy)]">
                    Tu certificado de este curso está disponible.
                  </p>
                </div>
                <Link href={`/courses/${courseId}/certificate`}>
                  <Button variant="secondary">Ver certificado</Button>
                </Link>
              </Card>
            )}
            <div className="flex items-start gap-6">
              <CourseSidebar
                vm={vm}
                courseId={courseId}
                activeSessionId={selectedSessionId}
                activeModuleId={selectedModuleId}
                onSelectModule={(sessionId, moduleId) => {
                  setSelectedSessionId(sessionId);
                  setSelectedModuleId(moduleId);
                }}
                collapsed={sidebarCollapsed}
                onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
              />

              <div className="min-w-0 flex-1">
                {activeSession?.status === "locked" ? (
                  <LockedState
                    reason={
                      activeSession.unlock.reasonLabel ??
                      "Esta sesión todavía no está disponible."
                    }
                  />
                ) : activeModule ? (
                  <ModuleViewer
                    module={activeModule}
                    completed={activeSession!.completedModuleIds.has(activeModule.id)}
                    onComplete={() => completeAndAdvance(activeModule.id)}
                    primaryLabel="Marcar como completado y continuar"
                  />
                ) : (
                  <Card bordered className="text-center">
                    <p className="text-[var(--color-navy)]">
                      ¡Completaste todo el contenido disponible del curso!
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
