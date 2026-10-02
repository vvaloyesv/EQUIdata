"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { queryKeys, useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildDashboard } from "@/lib/student/dashboard";
import { listAvailableCourses } from "@/lib/student/course";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/LockedState";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { RouteHistogram } from "@/components/ui/Charts";

export default function CoursesListPage() {
  const { user } = useAuth();
  const refresh = useRefresh();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const userId = user?.id ?? "";

  // Misma lectura que el dashboard (misma clave): si ya se abrió, aparece al instante.
  const { data, loading } = useRepoQuery(
    queryKeys.dashboard(userId),
    () =>
      buildDashboard(getRepository(), userId, user?.displayName ?? "", new Date().toISOString()),
    { enabled: !!user },
  );

  const { data: available } = useRepoQuery(
    ["available-courses", userId],
    () => listAvailableCourses(getRepository(), userId),
    { enabled: !!user },
  );

  async function enroll(courseId: string) {
    if (!user) return;
    setEnrollingId(courseId);
    await getRepository().createEnrollment({
      userId: user.id,
      courseId,
      enrolledAt: new Date().toISOString(),
    });
    await refresh();
    setEnrollingId(null);
  }

  if (loading || !data) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const completeCount = data.courses.filter((c) => c.totalModules > 0 && c.percent === 100).length;

  return (
    <div>
      <PageHeader
        eyebrow={`${data.courses.length} ${data.courses.length === 1 ? "curso" : "cursos"} · ${completeCount} ${
          completeCount === 1 ? "completo" : "completos"
        }`}
        title="Mis cursos"
        description="Tu ruta en cada curso, sesión por sesión."
      />
      <PageBody>
        <div className="space-y-3">
          {data.courses.map((c) => (
            <Link key={c.course.id} href={`/courses/${c.course.id}`} className="block">
              <Card bordered className="transition-colors hover:border-[var(--color-lavender)]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--color-navy)]">{c.course.title}</p>
                      {c.notStarted ? (
                        <Badge tone="locked">Sin empezar</Badge>
                      ) : c.percent === 100 ? (
                        <Badge tone="lime">Completo</Badge>
                      ) : !c.nextModuleId ? (
                        <Badge tone="lime">Al día</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{c.course.description}</p>
                    <div className="mt-3">
                      <Label>
                        {c.location} · {c.completedModules}/{c.totalModules} módulos · {c.percent}%
                      </Label>
                    </div>
                  </div>
                  <RouteHistogram sessions={c.sessions} height={48} className="sm:w-56 sm:shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
          {data.courses.length === 0 && (
            <EmptyState
              title="Todavía no tienes cursos."
              hint="Inscríbete en uno de los cursos disponibles de abajo."
            />
          )}
        </div>

        {available && available.length > 0 && (
          <section className="mt-12">
            <Label>Cursos disponibles · {available.length}</Label>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Cursos publicados en los que puedes inscribirte.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {available.map((course) => (
                <Card key={course.id} bordered className="flex flex-col">
                  <p className="font-medium text-[var(--color-navy)]">{course.title}</p>
                  <p className="mt-1 flex-1 text-sm text-[var(--color-muted)]">{course.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Label>{course.teacherName}</Label>
                    <Button
                      variant="secondary"
                      className="shrink-0 !px-4 !py-2"
                      disabled={enrollingId === course.id}
                      onClick={() => enroll(course.id)}
                    >
                      {enrollingId === course.id ? "Inscribiendo…" : "Inscribirme"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </PageBody>
    </div>
  );
}
