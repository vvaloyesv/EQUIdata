"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Download,
  FilePlus2,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { queryKeys, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildTeacherDashboard } from "@/lib/teacher/dashboard";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ProgressBar } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Input";
import { BandStat, PageBody, PageHeader } from "@/components/ui/Page";
import { EmptyState } from "@/components/ui/LockedState";

const ALL_COURSES = "__all__";

export default function TeacherDashboardPage() {
  const { data: courses } = useRepoQuery(queryKeys.courses(), () => getRepository().listCourses());
  // null = todavía no elegiste nada → usa el primer curso por defecto (no
  // "todos"), para no comparar peras con manzanas apenas se abre la pantalla.
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const activeCourseId =
    courseFilter === ALL_COURSES ? undefined : (courseFilter ?? courses?.[0]?.id);

  const { data: vm, loading } = useRepoQuery(
    ["teacher-dashboard", activeCourseId ?? ALL_COURSES],
    () => buildTeacherDashboard(getRepository(), activeCourseId),
    { enabled: !!courses },
  );

  if (loading || !vm || !courses) {
    return <BrandLoader label="Preparando el panel..." />;
  }

  const { distribution } = vm;
  const distTotal =
    distribution.completed +
    distribution.inProgress +
    distribution.atRisk +
    distribution.notStarted;
  const activeTitle = activeCourseId
    ? (courses.find((c) => c.id === activeCourseId)?.title ?? "Curso")
    : "Todos los cursos";

  return (
    <div>
      <PageHeader
        eyebrow={`Panel de la profesora · ${activeTitle}`}
        title="Resumen general"
        action={
          <div className="w-72 max-w-full [&_select]:border-white/20">
            <Select
              id="dashboard-course"
              aria-label="Curso"
              value={activeCourseId ?? ALL_COURSES}
              onChange={(e) => setCourseFilter(e.target.value)}
              options={[
                ...courses.map((c) => ({ value: c.id, label: c.title })),
                { value: ALL_COURSES, label: "Todos los cursos (agregado)" },
              ]}
            />
          </div>
        }
      >
        <div className="flex flex-wrap items-end gap-x-12 gap-y-5">
          <BandStat value={vm.totalStudents} label="Estudiantes activos" />
          <BandStat value={vm.activeCourses} label="Cursos activos" />
          <BandStat value={`${vm.averageProgress}%`} label="Avance promedio" />
          <BandStat value={vm.quizzesTaken} label="Quizzes rendidos" />
          {distribution.atRisk > 0 && (
            <span className="mb-1 rounded-[var(--radius-pill)] bg-[var(--color-coral)] px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-white">
              {distribution.atRisk} en riesgo
            </span>
          )}
        </div>
      </PageHeader>

      <PageBody>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card bordered>
          <div className="flex items-center justify-between">
            <Label>Distribución de progreso</Label>
            <span className="text-xs text-[var(--color-hint)]">
              {distTotal} inscripciones
            </span>
          </div>

          {distTotal === 0 ? (
            <EmptyState title="Aún no hay estudiantes inscritos." hint="Inscribe estudiantes desde el detalle del curso." />
          ) : (
            <>
              <div className="mt-4 flex h-3 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-divider)]">
                <div
                  className="h-full bg-[var(--color-lime)]"
                  style={{ width: `${(distribution.completed / distTotal) * 100}%` }}
                />
                <div
                  className="h-full bg-[var(--color-lavender)]"
                  style={{ width: `${(distribution.inProgress / distTotal) * 100}%` }}
                />
                <div
                  className="h-full bg-[var(--color-coral)]"
                  style={{ width: `${(distribution.atRisk / distTotal) * 100}%` }}
                />
                <div
                  className="h-full bg-[var(--color-hint)]"
                  style={{ width: `${(distribution.notStarted / distTotal) * 100}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <LegendRow color="var(--color-lime)" label="Completado" value={distribution.completed} />
                <LegendRow color="var(--color-lavender)" label="En progreso" value={distribution.inProgress} />
                <LegendRow color="var(--color-coral)" label="En riesgo" value={distribution.atRisk} />
                <LegendRow color="var(--color-hint)" label="No iniciado" value={distribution.notStarted} />
              </div>
              <p className="mt-3 text-xs text-[var(--color-hint)]">
                &quot;En riesgo&quot; = avance mayor a 0% y menor a 40%.
              </p>
            </>
          )}
        </Card>

        <Card bordered>
          <Label>Rendimiento por evaluación</Label>
          {vm.performanceByEvaluation.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Sin intentos registrados aún" />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {vm.performanceByEvaluation.map((p) => (
                <div key={p.evaluationTitle}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-[var(--color-navy)]">
                      {p.evaluationTitle}
                    </span>
                    <span className="font-display tabular text-[var(--color-navy)]">
                      {p.averageScore}%
                    </span>
                  </div>
                  <ProgressBar value={p.averageScore} className="mt-1.5" />
                  <Label className="mt-1">{p.attemptCount} intentos</Label>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <Label>Mis cursos</Label>
            <Link
              href="/teacher/courses/new"
              className="text-sm text-[var(--color-lavender-text)] hover:underline"
            >
              + Crear curso
            </Link>
          </div>
          <Card bordered className="!p-0">
            {vm.courseRows.length === 0 ? (
              <EmptyState title="Aún no has creado cursos" />
            ) : (
              vm.courseRows.map((row) => (
                <Link
                  key={row.course.id}
                  href={`/teacher/courses/${row.course.id}`}
                  className="flex items-center gap-4 border-b border-[var(--color-divider)] px-5 py-4 last:border-b-0 hover:bg-[var(--color-canvas)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-navy)]">
                      {row.course.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Users size={12} className="text-[var(--color-hint)]" />
                      <Label>{row.studentCount} estudiantes</Label>
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <ProgressBar value={row.avgProgress} />
                    <Label className="mt-1">{row.avgProgress}% promedio</Label>
                  </div>
                  <Badge tone={row.course.published ? "lime" : "locked"}>
                    {row.course.published ? "Activo" : "Borrador"}
                  </Badge>
                </Link>
              ))
            )}
          </Card>
        </section>

        <section>
          <div className="mb-3">
            <Label>Actividad reciente</Label>
          </div>
          <Card bordered>
            {vm.recentActivity.length === 0 ? (
              <EmptyState title="Sin actividad todavía" />
            ) : (
              <div className="space-y-4">
                {vm.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5">
                    <GraduationCap size={15} className="mt-0.5 shrink-0 text-[var(--color-lavender-text)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--color-navy)]">{a.label}</p>
                      <Label>{a.detail}</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="mt-4">
            <Label>Acciones rápidas</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <QuickAction href="/teacher/courses/new" icon={FilePlus2} label="Crear curso" />
              <QuickAction href="/teacher/courses" icon={TrendingUp} label="Crear quiz" />
              <QuickAction href="/teacher/grades" icon={ClipboardCheck} label="Calificaciones" />
              <QuickAction href="/teacher/grades" icon={Download} label="Exportar CSV" />
            </div>
          </div>
        </section>
      </div>
      </PageBody>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="ml-auto font-medium text-[var(--color-navy)]">{value}</span>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3 py-3 text-center text-xs text-[var(--color-navy)] hover:border-[var(--color-lavender)]"
    >
      <Icon size={18} className="text-[var(--color-lavender-text)]" />
      {label}
    </Link>
  );
}
