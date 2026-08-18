/**
 * Ensambla el view-model del dashboard del estudiante a partir del repositorio.
 * Toda la lógica de progreso vive aquí (no en el componente), y usa datos reales
 * — nada quemado salvo la gamificación de fachada, que va aparte.
 */

import type { Repository } from "@/lib/data/repository";
import type { CalendarEvent, Course, Module, MoodValue } from "@/lib/domain/types";
import { reviewModules } from "@/lib/logic/review";
import { computeStreak, dayKeyOf } from "@/lib/logic/gamification";

export interface CourseProgress {
  course: Course;
  totalModules: number;
  completedModules: number;
  percent: number;
  /** Ubicación legible: "Sesión 3 de 5". */
  location: string;
  /** true si aún no empieza (0%). */
  notStarted: boolean;
}

export interface DashboardVM {
  greetingName: string;
  stats: { completed: number; inProgress: number; average: number };
  /** Curso "sigue donde lo dejaste" (el de mayor progreso < 100). */
  resume?: CourseProgress;
  courses: CourseProgress[];
  reviewModules: Module[];
  events: CalendarEvent[];
  /** Días consecutivos con actividad (módulos completados), real desde M5. */
  streakDays: number;
  /** Ánimo que reportó hoy, o null si aún no responde. */
  currentMood: MoodValue | null;
}

/** Racha de días consecutivos con actividad — la misma cuenta que usa el dashboard, reusable donde haga falta (p. ej. el sidebar). */
export async function getStreakDays(
  repo: Repository,
  userId: string,
  nowIso: string,
): Promise<number> {
  const progress = await repo.listModuleProgress(userId);
  return computeStreak(
    progress.filter((p) => p.completed && p.completedAt).map((p) => p.completedAt!),
    nowIso,
  );
}

export async function buildDashboard(
  repo: Repository,
  userId: string,
  displayName: string,
  nowIso: string,
): Promise<DashboardVM> {
  const enrollments = await repo.listEnrollments(userId);
  const progress = await repo.listModuleProgress(userId);
  const completedIds = new Set(
    progress.filter((p) => p.completed).map((p) => p.moduleId),
  );

  const courses: CourseProgress[] = [];

  for (const e of enrollments) {
    const course = await repo.getCourse(e.courseId);
    if (!course) continue;

    const sessions = await repo.listSessions(course.id);
    let total = 0;
    let done = 0;
    const modulesBySession: Record<string, Module[]> = {};
    for (const s of sessions) {
      const mods = await repo.listModules(s.id);
      modulesBySession[s.id] = mods;
      total += mods.length;
      done += mods.filter((m) => completedIds.has(m.id)).length;
    }

    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    // Sesión "actual": la primera con módulos sin completar, o la última.
    let currentOrder = sessions.length ? 1 : 0;
    for (const s of sessions) {
      const mods = modulesBySession[s.id] ?? [];
      if (mods.some((m) => !completedIds.has(m.id))) {
        currentOrder = s.order;
        break;
      }
      currentOrder = s.order;
    }

    courses.push({
      course,
      totalModules: total,
      completedModules: done,
      percent,
      location: sessions.length
        ? `Sesión ${currentOrder} de ${sessions.length}`
        : "Sin sesiones",
      notStarted: done === 0,
    });
  }

  // "Sigue donde lo dejaste": mayor progreso entre los no terminados.
  const resume = courses
    .filter((c) => c.percent < 100 && !c.notStarted)
    .sort((a, b) => b.percent - a.percent)[0];

  // Repaso: sobre el curso "resume" (o el primero con progreso).
  const reviewSource = resume ?? courses.find((c) => !c.notStarted);
  let review: Module[] = [];
  if (reviewSource) {
    const sessions = await repo.listSessions(reviewSource.course.id);
    const modulesBySession: Record<string, Module[]> = {};
    for (const s of sessions) {
      modulesBySession[s.id] = await repo.listModules(s.id);
    }
    review = reviewModules({
      sessions,
      modulesBySession,
      completedModuleIds: completedIds,
    }).modules;
  }

  const events = await repo.listCalendarEvents(userId);

  const streakDays = computeStreak(
    progress.filter((p) => p.completed && p.completedAt).map((p) => p.completedAt!),
    nowIso,
  );
  const moodEntry = await repo.getMoodEntry(userId, dayKeyOf(nowIso));

  const stats = {
    completed: courses.filter((c) => c.percent === 100).length,
    inProgress: courses.filter((c) => !c.notStarted && c.percent < 100).length,
    average: courses.length
      ? Math.round(courses.reduce((a, c) => a + c.percent, 0) / courses.length)
      : 0,
  };

  return {
    greetingName: displayName,
    stats,
    resume,
    courses,
    reviewModules: review,
    events,
    streakDays,
    currentMood: moodEntry?.mood ?? null,
  };
}
