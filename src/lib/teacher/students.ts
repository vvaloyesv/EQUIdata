/**
 * Ensambla el detalle de un estudiante para el profesor: su perfil y el
 * estado de cada curso (inscrito con % de avance, o no inscrito) — insumo
 * para inscribir/desinscribir desde una sola pantalla.
 *
 * M10 · F4: dos tandas de lecturas; la estructura de todos los cursos
 * inscritos llega en una consulta.
 */

import type { Repository } from "@/lib/data/repository";
import type { Course, StudentProfile, User } from "@/lib/domain/types";
import { completedModuleIdsOf, courseCompletion } from "@/lib/student/course";

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
  const [student, profile, allCourses, enrollments, progress] = await Promise.all([
    repo.getUserById(userId),
    repo.getStudentProfile(userId),
    repo.listCourses(),
    repo.listEnrollments(userId),
    repo.listModuleProgress(userId),
  ]);
  if (!student) throw new Error(`Estudiante no encontrado: ${userId}`);

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const structures = await repo.getCourseStructures(
    allCourses.filter((c) => enrolledIds.has(c.id)).map((c) => c.id),
  );
  const structureById = new Map(structures.map((s) => [s.course.id, s]));
  const completedIds = completedModuleIdsOf(progress);

  const courses: StudentCourseRow[] = allCourses.map((course) => {
    const enrolled = enrolledIds.has(course.id);
    const structure = structureById.get(course.id);
    let percent = 0;
    if (enrolled && structure) {
      const { total, completed } = courseCompletion(structure, completedIds);
      percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    }
    return { course, enrolled, percent };
  });

  return { student, profile, courses };
}
