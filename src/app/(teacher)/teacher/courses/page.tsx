"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/LockedState";
import { getCourseCompletion } from "@/lib/student/course";

export default function TeacherCoursesPage() {
  const { data: rows, loading } = useAsync(async () => {
    const repo = getRepository();
    const courses = await repo.listCourses();
    const out = [];
    for (const course of courses) {
      const enrollments = await repo.listEnrollmentsByCourse(course.id);
      let sum = 0;
      for (const e of enrollments) {
        const { total, completed } = await getCourseCompletion(
          repo,
          e.userId,
          course.id,
        );
        sum += total > 0 ? (completed / total) * 100 : 0;
      }
      out.push({
        course,
        studentCount: enrollments.length,
        avgProgress: enrollments.length ? Math.round(sum / enrollments.length) : 0,
      });
    }
    return out;
  }, []);

  if (loading || !rows) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label>Contenido</Label>
          <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
            Cursos
          </h1>
        </div>
        <Link href="/teacher/courses/new">
          <Button>+ Crear curso</Button>
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <EmptyState
            title="Aún no has creado cursos"
            hint="Crea el primero para empezar a construir sesiones y módulos."
          />
        ) : (
          rows.map((row) => (
            <Link key={row.course.id} href={`/teacher/courses/${row.course.id}`}>
              <Card bordered className="transition-colors hover:border-[var(--color-lavender)]">
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--color-navy)]">
                      {row.course.title}
                    </p>
                    <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
                      {row.course.description}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Users size={12} className="text-[var(--color-hint)]" />
                      <Label>{row.studentCount} estudiantes</Label>
                    </div>
                  </div>
                  <div className="w-32 shrink-0">
                    <ProgressBar value={row.avgProgress} />
                    <Label className="mt-1">{row.avgProgress}% promedio</Label>
                  </div>
                  <Badge tone={row.course.published ? "lime" : "locked"}>
                    {row.course.published ? "Activo" : "Borrador"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
