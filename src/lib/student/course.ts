/**
 * Ensambla el view-model de la vista de curso/sesión (spec §5.3, §5.5).
 *
 * Aplica la doble condición de desbloqueo (fecha + quiz resuelto) sesión por
 * sesión, usando la lógica pura de src/lib/logic. Toda decisión de negocio
 * vive ahí; este módulo solo orquesta las lecturas del repositorio.
 *
 * M10 · F4: las lecturas se hacen en bloque y en paralelo (estructura del
 * curso, progreso, intentos e intentos extra de la persona: 4 consultas, sin
 * importar cuántas sesiones tenga el curso). El armado es una función pura
 * (`courseViewFrom`) que reutilizan el dashboard, Certificaciones y el panel
 * del profesor sin volver a consultar.
 */

import type { Repository } from "@/lib/data/repository";
import type {
  Attempt,
  Course,
  CourseStructure,
  Evaluation,
  Module,
  ModuleProgress,
  Session,
  SessionUnlockState,
} from "@/lib/domain/types";
import { sessionUnlockState } from "@/lib/logic/unlock";
import { attemptGate, isQuizResolved, type AttemptGate } from "@/lib/logic/attempts";
import { isCertificateEligible } from "@/lib/logic/certificate";

export type SessionStatus = "completed" | "in_progress" | "locked";

export interface SessionVM {
  session: Session;
  modules: Module[];
  completedModuleIds: Set<string>;
  status: SessionStatus;
  unlock: SessionUnlockState;
  quizEvaluation?: Evaluation;
  quizGate?: AttemptGate;
}

export interface CourseVM {
  course: Course;
  diagnosticInitial?: Evaluation;
  diagnosticFinal?: Evaluation;
  diagnosticDone: boolean;
  /** Onboarding de intereses del curso (no bloquea el avance, spec M8 §5). */
  interestOnboarding?: Evaluation;
  interestOnboardingDone: boolean;
  sessions: SessionVM[];
  /** Sesión a mostrar por defecto: la primera en progreso, o la primera bloqueada, o la última. */
  defaultSessionId?: string;
  /** El diagnóstico final se habilita en la última sesión, si el profesor lo activó. */
  finalDiagnosticAvailable: boolean;
  /** Elegibilidad real del certificado (spec §5.6): final aprobado + curso completo. */
  certificateEligible: boolean;
  /** Motivo cuando no es elegible (o no hay diagnóstico final configurado). */
  certificateReason?: string;
}

/** Ids de módulos completados a partir del progreso de una persona. */
export function completedModuleIdsOf(progress: ModuleProgress[]): Set<string> {
  return new Set(progress.filter((p) => p.completed).map((p) => p.moduleId));
}

/** Total de módulos del curso y cuántos de ellos están en `completedIds`. */
export function courseCompletion(
  structure: CourseStructure,
  completedIds: Set<string>,
): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const s of structure.sessions) {
    const modules = structure.modulesBySession[s.id] ?? [];
    total += modules.length;
    completed += modules.filter((m) => completedIds.has(m.id)).length;
  }
  return { total, completed };
}

export async function buildCourseView(
  repo: Repository,
  userId: string,
  courseId: string,
  nowIso: string,
): Promise<CourseVM> {
  const [structures, progress, attempts, bonusByEvaluation] = await Promise.all([
    repo.getCourseStructures([courseId]),
    repo.listModuleProgress(userId),
    repo.listAttemptsByUser(userId),
    repo.listBonusAttemptsByUser(userId),
  ]);
  const structure = structures[0];
  if (!structure) throw new Error(`Curso no encontrado: ${courseId}`);
  return courseViewFrom(structure, progress, attempts, bonusByEvaluation, nowIso);
}

/**
 * Arma el view-model del curso con datos ya cargados — sin consultas.
 * `attempts` y `bonusByEvaluation` son los de la persona (pueden incluir
 * otras evaluaciones; se filtran aquí).
 */
export function courseViewFrom(
  structure: CourseStructure,
  progress: ModuleProgress[],
  attempts: Attempt[],
  bonusByEvaluation: Record<string, number>,
  nowIso: string,
): CourseVM {
  const { course, sessions, modulesBySession, evaluations } = structure;
  const completedIds = completedModuleIdsOf(progress);
  const attemptsFor = (evaluationId: string) =>
    attempts.filter((a) => a.evaluationId === evaluationId);
  const bonusFor = (evaluationId: string) => bonusByEvaluation[evaluationId] ?? 0;

  const diagnosticInitial = evaluations.find((e) => e.kind === "diagnostic_initial");
  const diagnosticFinal = evaluations.find((e) => e.kind === "diagnostic_final");
  const interestOnboarding = evaluations.find((e) => e.kind === "interest_onboarding");

  const diagnosticDone = diagnosticInitial
    ? attemptsFor(diagnosticInitial.id).some((a) => a.status === "submitted")
    : true;
  const interestOnboardingDone = interestOnboarding
    ? attemptsFor(interestOnboarding.id).some((a) => a.status === "submitted")
    : false;

  const quizBySession = new Map<string, Evaluation>();
  for (const e of evaluations) {
    if (e.kind === "quiz" && e.sessionId) quizBySession.set(e.sessionId, e);
  }

  const sessionVMs: SessionVM[] = sessions.map((session, i) => {
    const modules = modulesBySession[session.id] ?? [];
    const isFirst = i === 0;

    let prevQuiz;
    if (!isFirst) {
      const prevQuizEval = quizBySession.get(sessions[i - 1].id);
      if (prevQuizEval) {
        const resolved = isQuizResolved({
          evaluation: prevQuizEval,
          attempts: attemptsFor(prevQuizEval.id),
          nowIso,
          bonusAttempts: bonusFor(prevQuizEval.id),
        });
        prevQuiz = {
          exists: true,
          passed: resolved.passed,
          attemptsExhausted: resolved.attemptsExhausted,
        };
      } else {
        prevQuiz = { exists: false, passed: false, attemptsExhausted: false };
      }
    }

    const unlock = sessionUnlockState({ session, isFirst, prevQuiz, diagnosticDone, nowIso });
    const allModulesDone = modules.length > 0 && modules.every((m) => completedIds.has(m.id));

    // El quiz de la propia sesión también cuenta para marcarla "completada":
    // si quedó pendiente (con intentos disponibles y sin aprobar), la sesión
    // sigue "en progreso" aunque ya viste todos sus módulos. Resuelto =
    // aprobado O intentos agotados (spec §5.5: el quiz nunca bloquea el
    // avance, pero mientras no esté resuelto, la sesión no cuenta como lista).
    const quizEvaluation = quizBySession.get(session.id);
    let quizGate: AttemptGate | undefined;
    let quizResolved = true;
    if (quizEvaluation) {
      const quizInput = {
        evaluation: quizEvaluation,
        attempts: attemptsFor(quizEvaluation.id),
        nowIso,
        bonusAttempts: bonusFor(quizEvaluation.id),
      };
      quizGate = attemptGate(quizInput);
      const resolved = isQuizResolved(quizInput);
      quizResolved = resolved.passed || resolved.attemptsExhausted;
    }

    const status: SessionStatus = !unlock.unlocked
      ? "locked"
      : allModulesDone && quizResolved
        ? "completed"
        : "in_progress";

    return {
      session,
      modules,
      completedModuleIds: completedIds,
      status,
      unlock,
      quizEvaluation,
      quizGate,
    };
  });

  // "completed" ya exige módulos Y quiz resueltos (ver arriba), así que
  // "in_progress" es exactamente "todavía hay algo que hacer aquí".
  const defaultSessionId =
    sessionVMs.find((s) => s.status === "in_progress")?.session.id ??
    sessionVMs.find((s) => s.status === "locked")?.session.id ??
    sessionVMs[sessionVMs.length - 1]?.session.id;

  const lastSession = sessionVMs[sessionVMs.length - 1];
  const finalDiagnosticAvailable = Boolean(
    diagnosticFinal?.isActive && lastSession?.unlock.unlocked,
  );

  let certificateEligible = false;
  let certificateReason: string | undefined = "Este curso no tiene diagnóstico final.";
  if (diagnosticFinal) {
    const { total, completed } = courseCompletion(structure, completedIds);
    const elig = isCertificateEligible({
      finalBestScore: bestAttemptScore(attemptsFor(diagnosticFinal.id)),
      finalPassingScore: diagnosticFinal.passingScore ?? 100,
      totalModules: total,
      completedModules: completed,
    });
    certificateEligible = elig.eligible;
    certificateReason = elig.reasonLabel;
  }

  return {
    course,
    diagnosticInitial,
    diagnosticFinal,
    diagnosticDone,
    interestOnboarding,
    interestOnboardingDone,
    sessions: sessionVMs,
    defaultSessionId,
    finalDiagnosticAvailable,
    certificateEligible,
    certificateReason,
  };
}

/**
 * La misma vista con un módulo más marcado como completado — para
 * actualizar la pantalla al instante al pulsar "completar", mientras se
 * confirma con el servidor (los estados de sesión se recalculan al refrescar).
 */
export function withModuleCompleted(vm: CourseVM, moduleId: string): CourseVM {
  const first = vm.sessions[0]?.completedModuleIds;
  if (!first || first.has(moduleId)) return vm;
  const completed = new Set(first).add(moduleId);
  return {
    ...vm,
    sessions: vm.sessions.map((s) => ({ ...s, completedModuleIds: completed })),
  };
}

export function bestAttemptScore(attempts: Attempt[]): number | undefined {
  const scores = attempts
    .filter((a) => a.status === "submitted" && a.score !== undefined)
    .map((a) => a.score!);
  return scores.length ? Math.max(...scores) : undefined;
}

export interface FlatModuleItem {
  sessionId: string;
  sessionTitle: string;
  module: Module;
}

/**
 * Lista plana de módulos, en orden, a través de todas las sesiones
 * desbloqueadas (spec §5.3: "Anterior/Siguiente clase" navega el curso
 * entero, no solo la sesión activa). Las sesiones bloqueadas no aportan
 * módulos navegables.
 */
export function flatUnlockedModules(vm: CourseVM): FlatModuleItem[] {
  const items: FlatModuleItem[] = [];
  for (const s of vm.sessions) {
    if (s.status === "locked") continue;
    for (const m of s.modules) {
      items.push({ sessionId: s.session.id, sessionTitle: s.session.title, module: m });
    }
  }
  return items;
}

/** Total de módulos del curso y cuántos completó la persona (para elegibilidad de certificado). */
export async function getCourseCompletion(
  repo: Repository,
  userId: string,
  courseId: string,
): Promise<{ total: number; completed: number }> {
  const [structures, progress] = await Promise.all([
    repo.getCourseStructures([courseId]),
    repo.listModuleProgress(userId),
  ]);
  const structure = structures[0];
  if (!structure) return { total: 0, completed: 0 };
  return courseCompletion(structure, completedModuleIdsOf(progress));
}

/** Cursos publicados en los que la persona todavía no está inscrita ("cursos disponibles"). */
export async function listAvailableCourses(
  repo: Repository,
  userId: string,
): Promise<Course[]> {
  const [courses, enrollments] = await Promise.all([
    repo.listCourses(),
    repo.listEnrollments(userId),
  ]);
  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  return courses.filter(
    (c) => c.published && c.enrollmentOpen && !enrolledIds.has(c.id),
  );
}
