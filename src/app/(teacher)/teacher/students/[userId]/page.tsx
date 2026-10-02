"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserMinus, UserPlus } from "lucide-react";
import { useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildStudentDetail } from "@/lib/teacher/students";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { PageBody, PageHeader } from "@/components/ui/Page";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const refresh = useRefresh();
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const { data: vm, loading } = useRepoQuery(["student-detail", userId], () =>
    buildStudentDetail(getRepository(), userId),
  );

  async function toggleEnrollment(courseId: string, enrolled: boolean) {
    setBusyCourseId(courseId);
    const repo = getRepository();
    if (enrolled) {
      await repo.removeEnrollment(userId, courseId);
    } else {
      await repo.createEnrollment({
        userId,
        courseId,
        enrolledAt: new Date().toISOString(),
      });
    }
    await refresh();
    setBusyCourseId(null);
  }

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { student, profile, courses } = vm;

  return (
    <div>
      <PageHeader
        back={
          <Link href="/teacher/students" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white">
            <ArrowLeft size={15} /> Estudiantes
          </Link>
        }
        eyebrow={profile ? `${profile.cargo} · ${profile.area}` : "Sin perfil completado"}
        title={student.displayName}
      />
      <PageBody width="reading">
      <div className="mt-8">
        <Label>Cursos</Label>
        <div className="mt-3 space-y-3">
          {courses.map(({ course, enrolled, percent }) => (
            <Card key={course.id} bordered className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-navy)]">{course.title}</p>
                {enrolled ? (
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar value={percent} className="max-w-[160px]" />
                    <Label>{percent}% de avance</Label>
                  </div>
                ) : (
                  <Badge tone="locked" className="mt-2">
                    No inscrito
                  </Badge>
                )}
              </div>
              <Button
                variant="secondary"
                disabled={busyCourseId === course.id}
                onClick={() => toggleEnrollment(course.id, enrolled)}
              >
                {enrolled ? <UserMinus size={15} /> : <UserPlus size={15} />}
                {enrolled ? "Desinscribir" : "Inscribir"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
      </PageBody>
    </div>
  );
}
