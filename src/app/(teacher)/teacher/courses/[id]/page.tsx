"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { cn } from "@/lib/cn";
import { buildTeacherCourseView } from "@/lib/teacher/course";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { useTeacherCourseActions } from "./useTeacherCourseActions";
import { DiagnosticsRow } from "./DiagnosticsRow";
import { CertificateSettingsSection } from "./CertificateSettingsSection";
import { EnrolledStudentsSection } from "./EnrolledStudentsSection";
import { SessionsSection } from "./SessionsSection";

const TABS = [
  { id: "contenido", label: "Contenido" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "estudiantes", label: "Estudiantes" },
  { id: "ajustes", label: "Ajustes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/**
 * Detalle de curso de la profesora (U4 · auditoría §11.3): pestañas para que
 * el trabajo principal (sesiones y módulos) quede primero, y las acciones de
 * publicación, con consecuencias para las estudiantes, queden en Ajustes y
 * pidan confirmación.
 */
export default function TeacherCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidate = useRefresh();
  const refresh = () => void invalidate();
  const requestedTab = searchParams.get("tab") as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === requestedTab) ? requestedTab! : "contenido";

  const { data: vm, loading } = useRepoQuery(["teacher-course", courseId], () =>
    buildTeacherCourseView(getRepository(), courseId),
  );

  const actions = useTeacherCourseActions(courseId, vm, refresh);

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const moduleCount = vm.sessions.reduce((a, s) => a + s.modules.length, 0);
  const quizCount = vm.sessions.filter((s) => s.quiz).length;

  function selectTab(id: TabId) {
    router.replace(`/teacher/courses/${courseId}${id === "contenido" ? "" : `?tab=${id}`}`, {
      scroll: false,
    });
  }

  /** Mueve una sesión una posición arriba/abajo intercambiando su orden con la vecina. */
  async function moveSession(index: number, delta: -1 | 1) {
    if (!vm) return;
    const a = vm.sessions[index]?.session;
    const b = vm.sessions[index + delta]?.session;
    if (!a || !b) return;
    const repo = getRepository();
    await Promise.all([
      repo.updateSession({ ...a, order: b.order }),
      repo.updateSession({ ...b, order: a.order }),
    ]);
    refresh();
  }

  return (
    <div>
      <PageHeader
        back={
          <Link href="/teacher/courses" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white">
            <ArrowLeft size={15} /> Cursos
          </Link>
        }
        eyebrow={[
          vm.course.published ? "Publicado" : "Borrador",
          vm.course.enrollmentOpen ? "Inscripciones abiertas" : "Inscripciones cerradas",
          `${vm.sessions.length} sesiones · ${moduleCount} módulos`,
          `${vm.enrolledStudents.length} ${vm.enrolledStudents.length === 1 ? "estudiante" : "estudiantes"}`,
        ].join(" · ")}
        title={vm.course.title}
        description={vm.course.description}
      >
        <nav className="-mb-8 flex gap-1 overflow-x-auto lg:-mb-10" aria-label="Secciones del curso">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-4 pb-3 pt-2 text-sm transition-colors",
                tab === t.id
                  ? "border-[var(--color-lime)] font-medium text-white"
                  : "border-transparent text-white/60 hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </PageHeader>

      <PageBody>
        {tab === "contenido" && (
          <SessionsSection
            sessions={vm.sessions}
            courseId={courseId}
            onAddSession={actions.addSession}
            onAddModule={actions.addModule}
            onMove={moveSession}
          />
        )}

        {tab === "evaluaciones" && (
          <div className="space-y-8">
            <section>
              <Label>Diagnósticos y onboarding</Label>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                El diagnóstico inicial fija la línea base; el final habilita el certificado.
              </p>
              <DiagnosticsRow
                vm={vm}
                courseId={courseId}
                onCreateDiagnostic={actions.createDiagnostic}
                onCreateInterestOnboarding={actions.createInterestOnboarding}
              />
            </section>
            <section>
              <Label>Quizzes de sesión · {quizCount}</Label>
              <div className="mt-3 space-y-2">
                {vm.sessions.map((s) => (
                  <Card key={s.session.id} bordered className="flex items-center justify-between gap-4 !py-4">
                    <div className="min-w-0">
                      <Label>Sesión {String(s.session.order).padStart(2, "0")}</Label>
                      <p className="mt-0.5 truncate text-sm text-[var(--color-navy)]">{s.session.title}</p>
                    </div>
                    {s.quiz ? (
                      <Link
                        href={`/teacher/courses/${courseId}/quiz/${s.quiz.id}`}
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-[var(--color-lavender-text)] hover:underline"
                      >
                        <ClipboardCheck size={14} /> {s.quiz.title}
                      </Link>
                    ) : (
                      <Link
                        href={`/teacher/courses/${courseId}/quiz/new?sessionId=${s.session.id}`}
                        className="shrink-0 text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] hover:underline"
                      >
                        + Crear quiz
                      </Link>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "estudiantes" && (
          <EnrolledStudentsSection
            enrolledStudents={vm.enrolledStudents}
            availableStudents={vm.availableStudents}
            onEnroll={actions.enrollStudent}
          />
        )}

        {tab === "ajustes" && (
          <div className="max-w-[720px] space-y-6">
            <PublishSettings
              published={vm.course.published}
              enrollmentOpen={vm.course.enrollmentOpen}
              onTogglePublished={actions.togglePublished}
              onToggleEnrollment={actions.toggleEnrollmentOpen}
            />
            <Card bordered>
              <Label>Certificado</Label>
              <CertificateSettingsSection
                course={vm.course}
                onSaveDescription={actions.saveCertDesc}
                onSaveDuration={actions.saveCertDuration}
              />
            </Card>
          </div>
        )}
      </PageBody>
    </div>
  );
}

/**
 * Publicación e inscripciones. Despublicar y cerrar inscripciones cambian lo
 * que ven las estudiantes, así que piden una confirmación en la misma tarjeta.
 */
function PublishSettings({
  published,
  enrollmentOpen,
  onTogglePublished,
  onToggleEnrollment,
}: {
  published: boolean;
  enrollmentOpen: boolean;
  onTogglePublished: () => void | Promise<void>;
  onToggleEnrollment: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState<"publish" | "enroll" | null>(null);

  const rows = [
    {
      id: "publish" as const,
      title: published ? "Publicado" : "Borrador",
      hint: published
        ? "Aparece en Cursos disponibles y las estudiantes pueden abrirlo."
        : "Las estudiantes no lo ven en Cursos disponibles ni pueden inscribirse por su cuenta.",
      action: published ? "Despublicar" : "Publicar",
      needsConfirm: published,
      confirmText:
        "Al despublicarlo deja de aparecer en Cursos disponibles. Las inscripciones y el progreso no se borran.",
      run: onTogglePublished,
    },
    {
      id: "enroll" as const,
      title: enrollmentOpen ? "Inscripciones abiertas" : "Inscripciones cerradas",
      hint: enrollmentOpen
        ? "Cualquier estudiante puede inscribirse sola si el curso está publicado."
        : "Solo tú inscribes estudiantes, desde la pestaña Estudiantes.",
      action: enrollmentOpen ? "Cerrar inscripciones" : "Abrir inscripciones",
      needsConfirm: enrollmentOpen,
      confirmText: "Nadie más podrá inscribirse por su cuenta. Quienes ya están inscritas siguen igual.",
      run: onToggleEnrollment,
    },
  ];

  return (
    <Card bordered className="divide-y divide-[var(--color-divider)] !py-2">
      {rows.map((r) => (
        <div key={r.id} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-navy)]">{r.title}</p>
              <p className="mt-1 max-w-[52ch] text-sm text-[var(--color-muted)]">{r.hint}</p>
            </div>
            {confirming !== r.id && (
              <Button
                variant="secondary"
                className="!px-4 !py-2"
                onClick={() => (r.needsConfirm ? setConfirming(r.id) : void r.run())}
              >
                {r.action}
              </Button>
            )}
          </div>
          {confirming === r.id && (
            <div className="mt-3 rounded-[var(--radius-token)] bg-[var(--color-coral-tint)] p-4">
              <p className="text-sm text-[var(--color-navy)]">{r.confirmText}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  className="!px-4 !py-2"
                  onClick={async () => {
                    await r.run();
                    setConfirming(null);
                  }}
                >
                  Sí, {r.action.toLowerCase()}
                </Button>
                <Button variant="secondary" className="!px-4 !py-2" onClick={() => setConfirming(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
