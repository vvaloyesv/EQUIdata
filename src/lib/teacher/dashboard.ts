/**
 * Ensambla el view-model del dashboard del profesor: KPIs, distribución de
 * progreso, rendimiento por evaluación, tabla de cursos y actividad reciente.
 * Todo calculado sobre datos reales del repositorio (spec §5.11).
 *
 * M10 · F4: cuatro tandas de lecturas en bloque (cursos → estructura +
 * inscripciones → progreso + intentos → autores de los intentos), sin
 * importar cuántos cursos, estudiantes o intentos haya. Antes era una
 * consulta por estudiante × sesión y otra por intento.
 */

import type { Repository } from "@/lib/data/repository";
import type { Course } from "@/lib/domain/types";
import { completedModuleIdsOf, courseCompletion } from "@/lib/student/course";

export interface CourseRow {
  course: Course;
  studentCount: number;
  avgProgress: number;
}

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  at: string;
}

export interface OutcomeStat {
  evaluationTitle: string;
  averageScore: number;
  attemptCount: number;
}

export interface TeacherDashboardVM {
  totalStudents: number;
  activeCourses: number;
  averageProgress: number;
  quizzesTaken: number;
  distribution: {
    completed: number;
    inProgress: number;
    atRisk: number;
    notStarted: number;
  };
  courseRows: CourseRow[];
  performanceByEvaluation: OutcomeStat[];
  recentActivity: ActivityItem[];
}

export async function buildTeacherDashboard(
  repo: Repository,
  courseId?: string,
): Promise<TeacherDashboardVM> {
  const allCourses = await repo.listCourses();
  // Filtra a un solo curso cuando se pasa un id — el resto de la función no
  // cambia: agregar sobre un array de 1 solo curso escopa todo (KPIs,
  // distribución, rendimiento) sin comparar cursos de tamaños distintos.
  const courses = courseId
    ? allCourses.filter((c) => c.id === courseId)
    : allCourses;

  const [structures, allEnrollments] = await Promise.all([
    repo.getCourseStructures(courses.map((c) => c.id)),
    repo.listAllEnrollments(),
  ]);
  const structureById = new Map(structures.map((s) => [s.course.id, s]));
  const courseIds = new Set(courses.map((c) => c.id));
  const enrollments = allEnrollments.filter((e) => courseIds.has(e.courseId));
  const evaluations = courses.flatMap((c) => structureById.get(c.id)?.evaluations ?? []);

  const [progress, attempts] = await Promise.all([
    repo.listModuleProgressForUsers([...new Set(enrollments.map((e) => e.userId))]),
    repo.listAttemptsByEvaluations(evaluations.map((e) => e.id)),
  ]);
  const submittedAttempts = attempts.filter(
    (a) => a.status === "submitted" && a.score !== undefined,
  );
  const authors = await repo.listUsersByIds([...new Set(submittedAttempts.map((a) => a.userId))]);
  const authorName = new Map(authors.map((u) => [u.id, u.displayName]));

  const completedByUser = new Map<string, Set<string>>();
  for (const userId of new Set(enrollments.map((e) => e.userId))) {
    completedByUser.set(userId, completedModuleIdsOf(progress.filter((p) => p.userId === userId)));
  }

  const courseRows: CourseRow[] = [];
  const allPercents: number[] = [];
  const studentIds = new Set<string>();
  const recentActivity: ActivityItem[] = [];
  let quizzesTaken = 0;
  const performanceByEvaluation: OutcomeStat[] = [];

  for (const course of courses) {
    const structure = structureById.get(course.id);
    const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
    const percents: number[] = [];

    for (const e of courseEnrollments) {
      studentIds.add(e.userId);
      const { total, completed } = structure
        ? courseCompletion(structure, completedByUser.get(e.userId) ?? new Set())
        : { total: 0, completed: 0 };
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      percents.push(percent);
      allPercents.push(percent);
    }

    courseRows.push({
      course,
      studentCount: courseEnrollments.length,
      avgProgress: percents.length
        ? Math.round(percents.reduce((a, p) => a + p, 0) / percents.length)
        : 0,
    });

    for (const ev of structure?.evaluations ?? []) {
      const submitted = submittedAttempts.filter((a) => a.evaluationId === ev.id);
      if (ev.kind === "quiz") quizzesTaken += submitted.length;

      if (submitted.length) {
        performanceByEvaluation.push({
          evaluationTitle: ev.title,
          averageScore: Math.round(
            submitted.reduce((a, at) => a + (at.score ?? 0), 0) / submitted.length,
          ),
          attemptCount: submitted.length,
        });
      }

      for (const at of submitted) {
        recentActivity.push({
          id: `att-${at.id}`,
          label: `${authorName.get(at.userId) ?? "Estudiante"} rindió ${ev.title}`,
          detail: `${at.score}%`,
          at: at.submittedAt ?? at.startedAt,
        });
      }
    }
  }

  const distribution = {
    completed: allPercents.filter((p) => p === 100).length,
    notStarted: allPercents.filter((p) => p === 0).length,
    atRisk: allPercents.filter((p) => p > 0 && p < 40).length,
    inProgress: allPercents.filter((p) => p >= 40 && p < 100).length,
  };

  recentActivity.sort((a, b) => b.at.localeCompare(a.at));

  return {
    totalStudents: studentIds.size,
    activeCourses: courses.filter((c) => c.published).length,
    averageProgress: allPercents.length
      ? Math.round(allPercents.reduce((a, p) => a + p, 0) / allPercents.length)
      : 0,
    quizzesTaken,
    distribution,
    courseRows,
    performanceByEvaluation,
    recentActivity: recentActivity.slice(0, 6),
  };
}
