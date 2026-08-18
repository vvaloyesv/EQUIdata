"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserMinus, UserPlus } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildStudentDetail } from "@/lib/teacher/students";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/Progress";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const { data: vm, loading } = useAsync(
    () => buildStudentDetail(getRepository(), userId),
    [userId, reloadKey],
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
    setBusyCourseId(null);
    setReloadKey((k) => k + 1);
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
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link
        href="/teacher/students"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)]"
      >
        <ArrowLeft size={15} /> Estudiantes
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={student.displayName} size={48} />
        <div>
          <h1 className="font-display text-2xl text-[var(--color-navy)]">
            {student.displayName}
          </h1>
          <Label>
            {profile ? `${profile.cargo} · ${profile.area}` : "Sin perfil completado"}
          </Label>
        </div>
      </div>

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
    </div>
  );
}
