"use client";

import { useState } from "react";
import { queryKeys, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildCourseProgressRows } from "@/lib/teacher/progress";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/LockedState";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { Select } from "@/components/ui/Input";

export default function TeacherProgressPage() {
  const { data: courses } = useRepoQuery(queryKeys.courses(), () => getRepository().listCourses());
  const [courseId, setCourseId] = useState<string>();

  const activeCourseId = courseId ?? courses?.[0]?.id;

  const { data: rows, loading } = useRepoQuery(
    ["course-progress-rows", activeCourseId ?? ""],
    () => buildCourseProgressRows(getRepository(), activeCourseId!),
    { enabled: !!activeCourseId },
  );

  if (!courses) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={rows ? `${rows.length} ${rows.length === 1 ? "inscripción" : "inscripciones"}` : "Progreso"}
        title="Progreso de estudiantes"
        description="Módulos completados por cada persona inscrita en el curso."
      />
      <PageBody>
      <div className="max-w-sm">
        <Select
          id="progress-course"
          label="Curso"
          value={activeCourseId ?? ""}
          onChange={(e) => setCourseId(e.target.value)}
          options={courses.map((c) => ({ value: c.id, label: c.title }))}
        />
      </div>

      <Card bordered className="mt-6 !p-0">
        {loading || !rows ? (
          <div className="p-5">
            <div className="h-6 w-32 animate-pulse rounded bg-[var(--color-divider)]" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="Nadie inscrito en este curso todavía." hint="Inscribe estudiantes desde el detalle del curso." />
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
      </PageBody>
    </div>
  );
}
