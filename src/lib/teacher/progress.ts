/**
 * View-models de avance para las listas del profesor: Cursos (estudiantes y
 * progreso promedio por curso), Estudiantes (directorio con cursos y
 * promedio) y Progreso (avance de cada inscrito en un curso).
 *
 * M10 · F4: cada uno hace dos tandas de lecturas en bloque, sin importar
 * cuántos cursos o estudiantes haya (antes: una consulta por estudiante ×
 * sesión, dentro de cada página).
 */

import type { Repository } from "@/lib/data/repository";
import type { Course, CourseStructure, ModuleProgress, StudentProfile, User } from "@/lib/domain/types";
import { completedModuleIdsOf, courseCompletion } from "@/lib/student/course";

/** % de avance (sin redondear) de una persona en un curso, a partir de datos ya cargados. */
function rawPercent(
  structure: CourseStructure | undefined,
  progress: ModuleProgress[],
  userId: string,
): number {
  if (!structure) return 0;
  const { total, completed } = courseCompletion(
    structure,
    completedModuleIdsOf(progress.filter((p) => p.userId === userId)),
  );
  return total > 0 ? (completed / total) * 100 : 0;
}

export interface TeacherCourseRow {
  course: Course;
  studentCount: number;
  avgProgress: number;
}

export async function buildTeacherCourseRows(repo: Repository): Promise<TeacherCourseRow[]> {
  const [courses, enrollments] = await Promise.all([
    repo.listCourses(),
    repo.listAllEnrollments(),
  ]);
  const [structures, progress] = await Promise.all([
    repo.getCourseStructures(courses.map((c) => c.id)),
    repo.listModuleProgressForUsers([...new Set(enrollments.map((e) => e.userId))]),
  ]);
  const structureById = new Map(structures.map((s) => [s.course.id, s]));

  return courses.map((course) => {
    const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
    const sum = courseEnrollments.reduce(
      (acc, e) => acc + rawPercent(structureById.get(course.id), progress, e.userId),
      0,
    );
    return {
      course,
      studentCount: courseEnrollments.length,
      avgProgress: courseEnrollments.length ? Math.round(sum / courseEnrollments.length) : 0,
    };
  });
}

export interface TeacherStudentRow {
  student: User;
  profile?: StudentProfile;
  courseCount: number;
  avgProgress: number;
}

export async function buildTeacherStudentRows(repo: Repository): Promise<TeacherStudentRow[]> {
  const [profiles, students, enrollments] = await Promise.all([
    repo.listStudentProfiles(),
    repo.listUsersByRole("student"),
    repo.listAllEnrollments(),
  ]);
  const [structures, progress] = await Promise.all([
    repo.getCourseStructures([...new Set(enrollments.map((e) => e.courseId))]),
    repo.listModuleProgressForUsers(students.map((s) => s.id)),
  ]);
  const structureById = new Map(structures.map((s) => [s.course.id, s]));

  const out: TeacherStudentRow[] = students.map((student) => {
    const mine = enrollments.filter((e) => e.userId === student.id);
    const sum = mine.reduce(
      (acc, e) => acc + rawPercent(structureById.get(e.courseId), progress, student.id),
      0,
    );
    return {
      student,
      profile: profiles.find((p) => p.userId === student.id),
      courseCount: mine.length,
      avgProgress: mine.length ? Math.round(sum / mine.length) : 0,
    };
  });
  return out.sort((a, b) => b.avgProgress - a.avgProgress);
}

export interface CourseProgressRow {
  student: User | null;
  percent: number;
  completed: number;
  total: number;
}

export async function buildCourseProgressRows(
  repo: Repository,
  courseId: string,
): Promise<CourseProgressRow[]> {
  const [enrollments, structures] = await Promise.all([
    repo.listEnrollmentsByCourse(courseId),
    repo.getCourseStructures([courseId]),
  ]);
  const userIds = enrollments.map((e) => e.userId);
  const [users, progress] = await Promise.all([
    repo.listUsersByIds(userIds),
    repo.listModuleProgressForUsers(userIds),
  ]);
  const structure = structures[0];

  const out: CourseProgressRow[] = enrollments.map((e) => {
    const { total, completed } = structure
      ? courseCompletion(structure, completedModuleIdsOf(progress.filter((p) => p.userId === e.userId)))
      : { total: 0, completed: 0 };
    return {
      student: users.find((u) => u.id === e.userId) ?? null,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed,
      total,
    };
  });
  return out.sort((a, b) => b.percent - a.percent);
}
