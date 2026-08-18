"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { getCourseCompletion } from "@/lib/student/course";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/LockedState";

export default function TeacherStudentsPage() {
  const [query, setQuery] = useState("");

  const { data: rows, loading } = useAsync(async () => {
    const repo = getRepository();
    const profiles = await repo.listStudentProfiles();
    const students = await repo.listUsersByRole("student");

    const out = [];
    for (const student of students) {
      const profile = profiles.find((p) => p.userId === student.id);
      const enrollments = await repo.listEnrollments(student.id);
      let sum = 0;
      for (const e of enrollments) {
        const { total, completed } = await getCourseCompletion(repo, student.id, e.courseId);
        sum += total > 0 ? (completed / total) * 100 : 0;
      }
      out.push({
        student,
        profile,
        courseCount: enrollments.length,
        avgProgress: enrollments.length ? Math.round(sum / enrollments.length) : 0,
      });
    }
    return out.sort((a, b) => b.avgProgress - a.avgProgress);
  }, []);

  if (loading || !rows) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const filtered = query.trim()
    ? rows.filter((r) =>
        r.student.displayName.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : rows;

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Label>Directorio</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Estudiantes
      </h1>

      <Input
        icon={Search}
        placeholder="Buscar por nombre…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-4 max-w-sm"
      />

      <Card bordered className="mt-6 !p-0">
        {filtered.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? "Sin estudiantes inscritos todavía"
                : "Ningún estudiante coincide con la búsqueda"
            }
          />
        ) : (
          filtered.map(({ student, profile, courseCount, avgProgress }) => (
            <Link
              key={student.id}
              href={`/teacher/students/${student.id}`}
              className="flex items-center gap-4 border-b border-[var(--color-divider)] px-5 py-4 last:border-b-0 hover:bg-[var(--color-canvas)]"
            >
              <Avatar name={student.displayName} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-navy)]">
                  {student.displayName}
                </p>
                <Label>
                  {profile ? `${profile.cargo} · ${profile.area}` : "Sin perfil completado"}
                </Label>
              </div>
              <div className="w-24 shrink-0 text-center">
                <div className="font-display tabular text-lg text-[var(--color-navy)]">
                  {courseCount}
                </div>
                <Label>cursos</Label>
              </div>
              <div className="w-28 shrink-0 text-center">
                <div className="font-display tabular text-lg text-[var(--color-navy)]">
                  {avgProgress}%
                </div>
                <Label>promedio</Label>
              </div>
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}
