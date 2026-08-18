"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildTeacherCourseView } from "@/lib/teacher/course";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useTeacherCourseActions } from "./useTeacherCourseActions";
import { DiagnosticsRow } from "./DiagnosticsRow";
import { CertificateSettingsSection } from "./CertificateSettingsSection";
import { EnrolledStudentsSection } from "./EnrolledStudentsSection";
import { SessionsSection } from "./SessionsSection";

export default function TeacherCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => setReloadKey((k) => k + 1);

  const { data: vm, loading } = useAsync(
    () => buildTeacherCourseView(getRepository(), courseId),
    [courseId, reloadKey],
  );

  const actions = useTeacherCourseActions(courseId, vm, refresh);

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link
        href="/teacher/courses"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)]"
      >
        <ArrowLeft size={15} /> Volver a cursos
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl text-[var(--color-navy)]">
              {vm.course.title}
            </h1>
            <Badge tone={vm.course.published ? "lime" : "locked"}>
              {vm.course.published ? "Activo" : "Borrador"}
            </Badge>
            <Badge tone={vm.course.enrollmentOpen ? "lavender" : "neutral"}>
              {vm.course.enrollmentOpen ? "Inscripciones abiertas" : "Inscripciones cerradas"}
            </Badge>
          </div>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
            {vm.course.description}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            className="!px-4 !py-2 text-sm"
            onClick={actions.toggleEnrollmentOpen}
          >
            {vm.course.enrollmentOpen ? "Cerrar inscripciones" : "Abrir inscripciones"}
          </Button>
          <Button
            variant="secondary"
            className="!px-4 !py-2 text-sm"
            onClick={actions.togglePublished}
          >
            {vm.course.published ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>
      {!vm.course.published && (
        <p className="mt-2 text-xs text-[var(--color-hint)]">
          En borrador: los estudiantes no lo ven en &quot;Cursos disponibles&quot; ni
          pueden inscribirse por su cuenta.
        </p>
      )}
      {vm.course.published && !vm.course.enrollmentOpen && (
        <p className="mt-2 text-xs text-[var(--color-hint)]">
          Inscripciones cerradas: solo tú puedes inscribir estudiantes desde
          &quot;Estudiantes inscritos&quot; más abajo.
        </p>
      )}

      <DiagnosticsRow
        vm={vm}
        courseId={courseId}
        onCreateDiagnostic={actions.createDiagnostic}
        onCreateInterestOnboarding={actions.createInterestOnboarding}
      />

      <CertificateSettingsSection
        course={vm.course}
        onSaveDescription={actions.saveCertDesc}
        onSaveDuration={actions.saveCertDuration}
      />

      <EnrolledStudentsSection
        enrolledStudents={vm.enrolledStudents}
        availableStudents={vm.availableStudents}
        onEnroll={actions.enrollStudent}
      />

      <SessionsSection
        sessions={vm.sessions}
        courseId={courseId}
        onAddSession={actions.addSession}
        onAddModule={actions.addModule}
      />
    </div>
  );
}
