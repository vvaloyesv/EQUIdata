"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  Download,
  FilePlus2,
  Gauge,
  GraduationCap,
  HelpCircle,
  Lock,
  LogOut,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildTeacherDashboard } from "@/lib/teacher/dashboard";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ProgressBar } from "@/components/ui/Progress";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/LockedState";

const ALL_COURSES = "__all__";

export default function TeacherDashboardPage() {
  const { user, logout } = useAuth();
  const { data: courses } = useAsync(() => getRepository().listCourses(), []);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  // null = todavía no elegiste nada → usa el primer curso por defecto (no
  // "todos"), para no comparar peras con manzanas apenas se abre la pantalla.
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const activeCourseId =
    courseFilter === ALL_COURSES ? undefined : (courseFilter ?? courses?.[0]?.id);

  const { data: vm, loading } = useAsync(async () => {
    if (!courses) return null;
    return buildTeacherDashboard(getRepository(), activeCourseId);
  }, [courses, activeCourseId]);

  if (loading || !vm || !courses) {
    return <BrandLoader label="Preparando el panel..." />;
  }

  const { distribution } = vm;
  const distTotal =
    distribution.completed +
    distribution.inProgress +
    distribution.atRisk +
    distribution.notStarted;
  const profileMenuItems = [
    { label: "Mi actividad", icon: Gauge },
    { label: "Configuración de la cuenta", icon: Settings },
    { label: "Configuración de privacidad", icon: Lock },
    { label: "Soporte", icon: HelpCircle },
  ];

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Label>Panel del profesor</Label>
          <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
            Resumen general
          </h1>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Curso</Label>
            <select
              value={activeCourseId ?? ALL_COURSES}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-64 rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
              <option value={ALL_COURSES}>Todos los cursos (agregado)</option>
            </select>
          </div>

          <div className="relative flex items-center gap-3">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-white hover:text-[var(--color-navy)]">
              <Bell size={18} />
              <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-[var(--color-coral)]" />
            </button>

            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-white px-2 py-1.5 text-[var(--color-navy)] shadow-[0_1px_3px_rgba(25,41,98,0.08)] transition-colors hover:bg-[var(--color-navy-tint)]"
            >
              <Avatar name={user?.displayName ?? "Profesora"} size={36} />
              <ChevronDown
                size={16}
                className={`transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-14 z-20 w-80 rounded-[28px] border border-[var(--color-divider)] bg-white/95 p-3 text-left text-[var(--color-navy)] shadow-[0_24px_60px_-30px_rgba(25,41,98,0.45)] backdrop-blur">
                <div className="space-y-1">
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-navy-tint)]"
                      >
                        <Icon size={18} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="my-2 h-px bg-[var(--color-divider)]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-coral-tint)]"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          value={vm.totalStudents}
          label="Estudiantes activos"
          tint="lavender"
        />
        <StatTile value={vm.activeCourses} label="Cursos activos" tint="lime" />
        <StatTile
          value={`${vm.averageProgress}%`}
          label="Progreso promedio"
          tint="coral"
        />
        <StatTile value={vm.quizzesTaken} label="Quizes realizados" tint="plain" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card bordered>
          <div className="flex items-center justify-between">
            <Label>Distribución de progreso</Label>
            <span className="text-xs text-[var(--color-hint)]">
              {distTotal} inscripciones
            </span>
          </div>

          {distTotal === 0 ? (
            <EmptyState title="Aún no hay estudiantes inscritos" />
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
