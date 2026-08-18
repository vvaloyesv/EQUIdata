/**
 * Ensambla el view-model de la vista de curso/sesión (spec §5.3, §5.5).
 *
 * Aplica la doble condición de desbloqueo (fecha + quiz resuelto) sesión por
 * sesión, usando la lógica pura de src/lib/logic. Toda decisión de negocio
 * vive ahí; este módulo solo orquesta las llamadas al repositorio.
 */

import type { Repository } from "@/lib/data/repository";
import type {
  Attempt,
  Course,
  Evaluation,
  Module,
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

export async function buildCourseView(
  repo: Repository,
  userId: string,
  courseId: string,
  nowIso: string,
): Promise<CourseVM> {
  const course = await repo.getCourse(courseId);
  if (!course) throw new Error(`Curso no encontrado: ${courseId}`);

  const sessions = await repo.listSessions(courseId);
  const evaluations = await repo.listEvaluations(courseId);
  const progress = await repo.listModuleProgress(userId);
  const completedIds = new Set(
    progress.filter((p) => p.completed).map((p) => p.moduleId),
  );

  const diagnosticInitial = evaluations.find(
    (e) => e.kind === "diagnostic_initial",
  );
  const diagnosticFinal = evaluations.find((e) => e.kind === "diagnostic_final");
  const interestOnboarding = evaluations.find((e) => e.kind === "interest_onboarding");

  let diagnosticDone = true;
  if (diagnosticInitial) {
    const attempts = await repo.listAttempts(userId, diagnosticInitial.id);
    diagnosticDone = attempts.some((a) => a.status === "submitted");
  }

  let interestOnboardingDone = false;
  if (interestOnboarding) {
    const attempts = await repo.listAttempts(userId, interestOnboarding.id);
    interestOnboardingDone = attempts.some((a) => a.status === "submitted");
  }

  const quizBySession = new Map<string, Evaluation>();
  for (const e of evaluations) {
    if (e.kind === "quiz" && e.sessionId) quizBySession.set(e.sessionId, e);
  }

  const sessionVMs: SessionVM[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const modules = await repo.listModules(session.id);

    const isFirst = i === 0;
    let prevQuiz;
    if (!isFirst) {
      const prevSession = sessions[i - 1];
      const prevQuizEval = quizBySession.get(prevSession.id);
      if (prevQuizEval) {
        const prevAttempts = await repo.listAttempts(userId, prevQuizEval.id);
        const prevBonus = await repo.getBonusAttempts(userId, prevQuizEval.id);
        const resolved = isQuizResolved({
          evaluation: prevQuizEval,
          attempts: prevAttempts,
          nowIso,
          bonusAttempts: prevBonus,
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

    const unlock = sessionUnlockState({
      session,
      isFirst,
      prevQuiz,
      diagnosticDone,
      nowIso,
    });

    const allModulesDone =
      modules.length > 0 && modules.every((m) => completedIds.has(m.id));

    // El quiz de la propia sesión también cuenta para marcarla "completada":
    // si quedó pendiente (con intentos disponibles y sin aprobar), la sesión
    // sigue "en progreso" aunque ya viste todos sus módulos. Resuelto =
    // aprobado O intentos agotados (spec §5.5: el quiz nunca bloquea el
    // avance, pero mientras no esté resuelto, la sesión no cuenta como lista).
    const quizEvaluation = quizBySession.get(session.id);
    let quizGate: AttemptGate | undefined;
    let quizResolved = true;
    if (quizEvaluation) {
      const quizAttempts = await repo.listAttempts(userId, quizEvaluation.id);
      const bonus = await repo.getBonusAttempts(userId, quizEvaluation.id);
      quizGate = attemptGate({
        evaluation: quizEvaluation,
        attempts: quizAttempts,
        nowIso,
        bonusAttempts: bonus,
      });
      const resolved = isQuizResolved({
        evaluation: quizEvaluation,
        attempts: quizAttempts,
        nowIso,
        bonusAttempts: bonus,
      });
      quizResolved = resolved.passed || resolved.attemptsExhausted;
    }

    const status: SessionStatus = !unlock.unlocked
      ? "locked"
      : allModulesDone && quizResolved
        ? "completed"
        : "in_progress";

    sessionVMs.push({
      session,
      modules,
      completedModuleIds: completedIds,
      status,
      unlock,
      quizEvaluation,
      quizGate,
    });
  }

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
  let certificateReason: string | undefined =
    "Este curso no tiene diagnóstico final.";
  if (diagnosticFinal) {
    const totalModules = sessionVMs.reduce((a, s) => a + s.modules.length, 0);
    const completedModules = sessionVMs.reduce(
      (a, s) => a + s.modules.filter((m) => completedIds.has(m.id)).length,
      0,
    );
    const finalAttempts = await repo.listAttempts(userId, diagnosticFinal.id);
    const elig = isCertificateEligible({
      finalBestScore: bestAttemptScore(finalAttempts),
      finalPassingScore: diagnosticFinal.passingScore ?? 100,
      totalModules,
      completedModules,
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
  const sessions = await repo.listSessions(courseId);
  const progress = await repo.listModuleProgress(userId);
  const completedIds = new Set(
    progress.filter((p) => p.completed).map((p) => p.moduleId),
  );

  let total = 0;
  let completed = 0;
  for (const s of sessions) {
    const modules = await repo.listModules(s.id);
    total += modules.length;
    completed += modules.filter((m) => completedIds.has(m.id)).length;
  }
  return { total, completed };
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
