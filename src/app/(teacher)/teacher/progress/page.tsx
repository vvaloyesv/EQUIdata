"use client";

import { useState } from "react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { getCourseCompletion } from "@/lib/student/course";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/LockedState";

export default function TeacherProgressPage() {
  const { data: courses } = useAsync(() => getRepository().listCourses(), []);
  const [courseId, setCourseId] = useState<string>();

  const activeCourseId = courseId ?? courses?.[0]?.id;

  const { data: rows, loading } = useAsync(async () => {
    if (!activeCourseId) return null;
    const repo = getRepository();
    const enrollments = await repo.listEnrollmentsByCourse(activeCourseId);
    const out = [];
    for (const e of enrollments) {
      const student = await repo.getUserById(e.userId);
      const { total, completed } = await getCourseCompletion(repo, e.userId, activeCourseId);
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      out.push({ student, percent, completed, total });
    }
    return out.sort((a, b) => b.percent - a.percent);
  }, [activeCourseId]);

  if (!courses) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Label>Mini dashboard</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Progreso de estudiantes
      </h1>

      <div className="mt-4 flex flex-col gap-1.5">
        <label>
          <Label>Curso</Label>
        </label>
        <select
          value={activeCourseId ?? ""}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full max-w-sm rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <Card bordered className="mt-6 !p-0">
        {loading || !rows ? (
          <div className="p-5">
            <div className="h-6 w-32 animate-pulse rounded bg-[var(--color-divider)]" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="Nadie inscrito en este curso todavía" />
        ) : (
          rows.map(({ student, percent, completed, total }) => (
            <div
              key={student?.id}
              className="flex items-center gap-4 border-b border-[var(--color-divider)] px-5 py-4 last:border-b-0"
            >
              <Avatar name={student?.displayName ?? "?"} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-navy)]">
                  {student?.displayName}
                </p>
                <Label>{completed}/{total} módulos</Label>
              </div>
              <div className="w-32 shrink-0">
                <ProgressBar value={percent} />
              </div>
              <Badge
                tone={
                  percent === 100 ? "lime" : percent === 0 ? "locked" : percent < 40 ? "coral" : "lavender"
                }
              >
                {percent}%
              </Badge>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
