/**
 * Ensambla el view-model del dashboard del estudiante a partir del repositorio.
 * Toda la lógica de progreso vive aquí (no en el componente), y usa datos reales
 * — nada quemado salvo la gamificación de fachada, que va aparte.
 *
 * M10 · F4: dos tandas de lecturas en paralelo (inscripciones, progreso,
 * eventos y ánimo; luego la estructura de todos los cursos inscritos en una
 * consulta), sin importar cuántos cursos o sesiones haya. El repaso reutiliza
 * esa misma estructura en vez de volver a pedirla.
 */

import type { Repository } from "@/lib/data/repository";
import type { CalendarEvent, Course, Module, MoodValue } from "@/lib/domain/types";
import { reviewModules } from "@/lib/logic/review";
import { computeStreak, dayKeyOf } from "@/lib/logic/gamification";
import { completedModuleIdsOf, courseCompletion } from "@/lib/student/course";

export interface CourseProgress {
  course: Course;
  totalModules: number;
  completedModules: number;
  percent: number;
  /** Ubicación legible: "Sesión 3 de 5". */
  location: string;
  /** true si aún no empieza (0%). */
  notStarted: boolean;
  /** Una barra por sesión, en orden: el mini histograma de la ruta. */
  sessions: SessionBar[];
  /** Próxima sesión que se libera por fecha (si hay alguna en el futuro). */
  nextUnlock?: { order: number; title: string; date: string };
  /** Primer módulo pendiente de una sesión ya liberada — destino de "Reanudar". */
  nextModuleId?: string;
  /** El curso tiene diagnóstico final activo. */
  hasFinalDiagnostic: boolean;
}

export interface SessionBar {
  id: string;
  order: number;
  title: string;
  /** 0–100 sobre los módulos de la sesión. */
  percent: number;
  /** Aún no llega su fecha de liberación. */
  upcoming: boolean;
  unlockDate?: string;
}

/**
 * Estado de la tarjeta "Tu ruta" del dashboard: no dice "aún no has
 * empezado" a quien ya terminó (auditoría U1 · E2).
 */
export type RouteState =
  | { kind: "none" }
  | { kind: "not_started"; course: CourseProgress }
  | { kind: "in_progress"; course: CourseProgress }
  /** Hizo todo lo liberado, pero el curso aún tiene sesiones por delante. */
  | { kind: "up_to_date"; course: CourseProgress }
  | { kind: "complete"; course: CourseProgress };

export interface DashboardVM {
  greetingName: string;
  stats: { completed: number; inProgress: number; average: number };
  /** Curso "sigue donde lo dejaste" (el de mayor progreso < 100). */
  resume?: CourseProgress;
  route: RouteState;
  courses: CourseProgress[];
  reviewModules: Module[];
  /** Curso al que pertenecen los módulos de repaso (para enlazar a cada clase). */
  reviewCourseId?: string;
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
  const [enrollments, progress, events, moodEntry] = await Promise.all([
    repo.listEnrollments(userId),
    repo.listModuleProgress(userId),
    repo.listCalendarEvents(userId),
    repo.getMoodEntry(userId, dayKeyOf(nowIso)),
  ]);
  const structures = await repo.getCourseStructures(enrollments.map((e) => e.courseId));
  const completedIds = completedModuleIdsOf(progress);

  const courses: CourseProgress[] = structures.map((structure) => {
    const { course, sessions, modulesBySession } = structure;
    const { total, completed: done, percent } = courseCompletion(structure, completedIds);

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

    const nowMs = new Date(nowIso).getTime();
    const bars: SessionBar[] = sessions.map((s) => {
      const mods = modulesBySession[s.id] ?? [];
      const doneInSession = mods.filter((m) => completedIds.has(m.id)).length;
      return {
        id: s.id,
        order: s.order,
        title: s.title,
        percent: mods.length ? Math.round((doneInSession / mods.length) * 100) : 0,
        upcoming: !!s.unlockDate && new Date(s.unlockDate).getTime() > nowMs,
        unlockDate: s.unlockDate,
      };
    });
    const upcoming = sessions.find((s) => s.unlockDate && new Date(s.unlockDate).getTime() > nowMs);
    const nextModule = sessions
      .filter((s) => !s.unlockDate || new Date(s.unlockDate).getTime() <= nowMs)
      .flatMap((s) => modulesBySession[s.id] ?? [])
      .find((m) => !completedIds.has(m.id));

    return {
      course,
      totalModules: total,
      completedModules: done,
      percent,
      location: sessions.length ? `Sesión ${currentOrder} de ${sessions.length}` : "Sin sesiones",
      notStarted: done === 0,
      sessions: bars,
      nextUnlock: upcoming
        ? { order: upcoming.order, title: upcoming.title, date: upcoming.unlockDate! }
        : undefined,
      nextModuleId: nextModule?.id,
      hasFinalDiagnostic: structure.evaluations.some(
        (e) => e.kind === "diagnostic_final" && e.isActive,
      ),
    };
  });

  // "Sigue donde lo dejaste": mayor progreso entre los que tienen algo
  // liberado por hacer (si ya hizo todo lo liberado, no hay qué "reanudar").
  const resume = courses
    .filter((c) => c.percent < 100 && !c.notStarted && c.nextModuleId)
    .sort((a, b) => b.percent - a.percent)[0];

  const finished = courses.find((c) => c.totalModules > 0 && c.percent === 100);
  const upToDate = courses.find((c) => !c.notStarted && c.percent < 100 && !c.nextModuleId);
  const route: RouteState = resume
    ? { kind: "in_progress", course: resume }
    : upToDate
      ? { kind: "up_to_date", course: upToDate }
      : finished
        ? { kind: "complete", course: finished }
        : courses[0]
          ? { kind: "not_started", course: courses[0] }
          : { kind: "none" };

  // Repaso: sobre el curso "resume" (o el primero con progreso).
  const reviewSource = resume ?? courses.find((c) => !c.notStarted);
  const reviewStructure = reviewSource
    ? structures.find((s) => s.course.id === reviewSource.course.id)
    : undefined;
  const review = reviewStructure
    ? reviewModules({
        sessions: reviewStructure.sessions,
        modulesBySession: reviewStructure.modulesBySession,
        completedModuleIds: completedIds,
      }).modules
    : [];

  const streakDays = computeStreak(
    progress.filter((p) => p.completed && p.completedAt).map((p) => p.completedAt!),
    nowIso,
  );

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
    route,
    courses,
    reviewModules: review,
    reviewCourseId: review.length ? reviewStructure?.course.id : undefined,
    events,
    streakDays,
    currentMood: moodEntry?.mood ?? null,
  };
}
