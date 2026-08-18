"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildDashboard } from "@/lib/student/dashboard";
import { listAvailableCourses } from "@/lib/student/course";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";

export default function CoursesListPage() {
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const { data, loading } = useAsync(
    () =>
      user
        ? buildDashboard(getRepository(), user.id, user.displayName, new Date().toISOString())
        : Promise.resolve(null),
    [user?.id, reloadKey],
  );

  const { data: available } = useAsync(
    () => (user ? listAvailableCourses(getRepository(), user.id) : Promise.resolve(null)),
    [user?.id, reloadKey],
  );

  async function enroll(courseId: string) {
    if (!user) return;
    setEnrollingId(courseId);
    await getRepository().createEnrollment({
      userId: user.id,
      courseId,
      enrolledAt: new Date().toISOString(),
    });
    setEnrollingId(null);
    setReloadKey((k) => k + 1);
  }

  if (loading || !data) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Label>Panel de aprendizaje</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Mis cursos
      </h1>

      <div className="mt-6 space-y-3">
        {data.courses.map((c) => (
          <Link key={c.course.id} href={`/courses/${c.course.id}`}>
            <Card bordered className="transition-colors hover:border-[var(--color-lavender)]">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-navy)]">
                    {c.course.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {c.course.description}
                  </p>
                  <div className="mt-2">
                    <Label>{c.location}</Label>
                  </div>
                  <ProgressBar value={c.percent} className="mt-2 max-w-sm" />
                </div>
                <div className="shrink-0 text-right">
                  {c.notStarted ? (
                    <Badge tone="locked">No iniciado</Badge>
                  ) : c.percent === 100 ? (
                    <Badge tone="lime">Completado</Badge>
                  ) : (
                    <>
                      <div className="font-display tabular text-lg text-[var(--color-navy)]">
                        {c.percent}%
                      </div>
                      <Label>de avance</Label>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {data.courses.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">
            Todavía no estás inscrita en ningún curso.
          </p>
        )}
      </div>

      {available && available.length > 0 && (
        <div className="mt-10">
          <Label>Cursos disponibles</Label>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Cursos publicados por el profesor en los que puedes inscribirte.
          </p>
          <div className="mt-4 space-y-3">
            {available.map((course) => (
              <Card key={course.id} bordered className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-navy)]">
                    {course.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {course.description}
                  </p>
                  <div className="mt-2">
                    <Label>{course.teacherName}</Label>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 !px-4 !py-2 text-sm"
                  disabled={enrollingId === course.id}
                  onClick={() => enroll(course.id)}
                >
                  {enrollingId === course.id ? "Inscribiendo…" : "Inscribirme"}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
