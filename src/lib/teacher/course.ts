/**
 * Ensambla el view-model del editor de curso del profesor: sesiones con sus
 * módulos y el quiz de sesión (si existe), y los diagnósticos del curso.
 */

import type { Repository } from "@/lib/data/repository";
import type { Course, Evaluation, Module, Session, User } from "@/lib/domain/types";

export interface TeacherSessionVM {
  session: Session;
  modules: Module[];
  quiz?: Evaluation;
}

export interface TeacherCourseVM {
  course: Course;
  sessions: TeacherSessionVM[];
  diagnosticInitial?: Evaluation;
  diagnosticFinal?: Evaluation;
  interestOnboarding?: Evaluation;
  /** Estudiantes ya inscritos en el curso. */
  enrolledStudents: User[];
  /** Estudiantes que aún no están inscritos (candidatos para inscribir). */
  availableStudents: User[];
}

export async function buildTeacherCourseView(
  repo: Repository,
  courseId: string,
): Promise<TeacherCourseVM> {
  // M10 · F4: tres lecturas en paralelo (antes, una por sesión en serie).
  const [structures, allStudents, enrollments] = await Promise.all([
    repo.getCourseStructures([courseId]),
    repo.listUsersByRole("student"),
    repo.listEnrollmentsByCourse(courseId),
  ]);
  const structure = structures[0];
  if (!structure) throw new Error(`Curso no encontrado: ${courseId}`);
  const { course, sessions, modulesBySession, evaluations } = structure;

  const sessionVMs: TeacherSessionVM[] = sessions.map((session) => ({
    session,
    modules: modulesBySession[session.id] ?? [],
    quiz: evaluations.find((e) => e.kind === "quiz" && e.sessionId === session.id),
  }));

  const enrolledIds = new Set(enrollments.map((e) => e.userId));
  const enrolledStudents = allStudents.filter((s) => enrolledIds.has(s.id));
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s.id));

  return {
    course,
    sessions: sessionVMs,
    diagnosticInitial: evaluations.find((e) => e.kind === "diagnostic_initial"),
    diagnosticFinal: evaluations.find((e) => e.kind === "diagnostic_final"),
    interestOnboarding: evaluations.find((e) => e.kind === "interest_onboarding"),
    enrolledStudents,
    availableStudents,
  };
}

/** Genera un id legible y único para el mock (Supabase usará su propio id real). */
export function genId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
