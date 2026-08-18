/**
 * Ensambla el view-model del dashboard del profesor: KPIs, distribución de
 * progreso, rendimiento por evaluación, tabla de cursos y actividad reciente.
 * Todo calculado sobre datos reales del repositorio (spec §5.11).
 */

import type { Repository } from "@/lib/data/repository";
import type { Course } from "@/lib/domain/types";
import { getCourseCompletion } from "@/lib/student/course";

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

  const courseRows: CourseRow[] = [];
  const allPercents: number[] = [];
  const studentIds = new Set<string>();
  const recentActivity: ActivityItem[] = [];
  let quizzesTaken = 0;
  const performanceByEvaluation: OutcomeStat[] = [];

  for (const course of courses) {
    const enrollments = await repo.listEnrollmentsByCourse(course.id);
    const percents: number[] = [];

    for (const e of enrollments) {
      studentIds.add(e.userId);
      const { total, completed } = await getCourseCompletion(
        repo,
        e.userId,
        course.id,
      );
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      percents.push(percent);
      allPercents.push(percent);
    }

    courseRows.push({
      course,
      studentCount: enrollments.length,
      avgProgress: percents.length
        ? Math.round(percents.reduce((a, p) => a + p, 0) / percents.length)
        : 0,
    });

    const evaluations = await repo.listEvaluations(course.id);
    for (const ev of evaluations) {
      const attempts = await repo.listAttemptsByEvaluation(ev.id);
      const submitted = attempts.filter(
        (a) => a.status === "submitted" && a.score !== undefined,
      );
      if (ev.kind === "quiz") quizzesTaken += submitted.length;

      if (submitted.length) {
        performanceByEvaluation.push({
          evaluationTitle: ev.title,
          averageScore: Math.round(
            submitted.reduce((a, at) => a + (at.score ?? 0), 0) /
              submitted.length,
          ),
          attemptCount: submitted.length,
        });
      }

      for (const at of submitted) {
        const student = await repo.getUserById(at.userId);
        recentActivity.push({
          id: `att-${at.id}`,
          label: `${student?.displayName ?? "Estudiante"} rindió ${ev.title}`,
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
