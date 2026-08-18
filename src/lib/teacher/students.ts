/**
 * Ensambla el detalle de un estudiante para el profesor: su perfil y el
 * estado de cada curso (inscrito con % de avance, o no inscrito) — insumo
 * para inscribir/desinscribir desde una sola pantalla.
 */

import type { Repository } from "@/lib/data/repository";
import type { Course, StudentProfile, User } from "@/lib/domain/types";
import { getCourseCompletion } from "@/lib/student/course";

export interface StudentCourseRow {
  course: Course;
  enrolled: boolean;
  percent: number;
}

export interface StudentDetailVM {
  student: User;
  profile: StudentProfile | null;
  courses: StudentCourseRow[];
}

export async function buildStudentDetail(
  repo: Repository,
  userId: string,
): Promise<StudentDetailVM> {
  const student = await repo.getUserById(userId);
  if (!student) throw new Error(`Estudiante no encontrado: ${userId}`);

  const [profile, allCourses, enrollments] = await Promise.all([
    repo.getStudentProfile(userId),
    repo.listCourses(),
    repo.listEnrollments(userId),
  ]);
  const enrolledIds = new Set(enrollments.map((e) => e.courseId));

  const courses: StudentCourseRow[] = [];
  for (const course of allCourses) {
    const enrolled = enrolledIds.has(course.id);
    let percent = 0;
    if (enrolled) {
      const { total, completed } = await getCourseCompletion(repo, userId, course.id);
      percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    }
    courses.push({ course, enrolled, percent });
  }

  return { student, profile, courses };
}
