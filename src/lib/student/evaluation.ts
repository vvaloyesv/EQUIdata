/**
 * Ensambla el view-model de una evaluación (quiz o diagnóstico) para el
 * estudiante: preguntas, opciones, resultados de aprendizaje y la puerta de
 * intentos (spec §5.4). La calificación en sí vive en lib/logic/grading.
 */

import type { Repository } from "@/lib/data/repository";
import type {
  Archetype,
  Evaluation,
  LearningOutcome,
  Question,
  QuestionOption,
} from "@/lib/domain/types";
import { attemptGate, type AttemptGate } from "@/lib/logic/attempts";
import { computeArchetypeResult, type ArchetypeResult } from "@/lib/logic/archetype";

export interface EvaluationVM {
  evaluation: Evaluation;
  questions: Question[];
  optionsByQuestion: Record<string, QuestionOption[]>;
  outcomes: LearningOutcome[];
  /** Arquetipos del curso — solo relevantes cuando evaluation.kind === 'interest_onboarding'. */
  archetypes: Archetype[];
  /** Resultado ya calculado, si el estudiante ya respondió este onboarding antes. */
  priorArchetypeResult?: ArchetypeResult;
  gate: AttemptGate;
  /** Undefined en quizzes de tutorial — no pertenecen a un curso. */
  courseId?: string;
  /**
   * Para quizes de sesión: si los módulos previos ya están completos. Si no,
   * el quiz no se puede rendir — protege tanto la UI (link deshabilitado)
   * como el acceso directo por URL.
   */
  modulesGate: { ok: boolean; reasonLabel?: string };
}

export async function buildEvaluationView(
  repo: Repository,
  userId: string,
  evaluationId: string,
  nowIso: string,
): Promise<EvaluationVM> {
  // M10 · F4: preguntas + opciones + RA en una consulta, en paralelo con los
  // intentos de la persona; antes era una consulta por pregunta.
  const [detail, attempts, bonusAttempts, progress] = await Promise.all([
    repo.getEvaluationDetail(evaluationId),
    repo.listAttempts(userId, evaluationId),
    repo.getBonusAttempts(userId, evaluationId),
    repo.listModuleProgress(userId),
  ]);
  if (!detail) throw new Error(`Evaluación no encontrada: ${evaluationId}`);
  const { evaluation, questions, optionsByQuestion, outcomes } = detail;

  const isSessionQuiz = evaluation.kind === "quiz" && !!evaluation.sessionId;
  const [archetypes, sessionModules] = await Promise.all([
    evaluation.courseId ? repo.listArchetypes(evaluation.courseId) : Promise.resolve([]),
    isSessionQuiz ? repo.listModules(evaluation.sessionId!) : Promise.resolve([]),
  ]);

  const gate = attemptGate({ evaluation, attempts, nowIso, bonusAttempts });

  let modulesGate: { ok: boolean; reasonLabel?: string } = { ok: true };
  if (isSessionQuiz) {
    const modules = sessionModules;
    const completedIds = new Set(
      progress.filter((p) => p.completed).map((p) => p.moduleId),
    );
    const allDone =
      modules.length > 0 && modules.every((m) => completedIds.has(m.id));
    modulesGate = allDone
      ? { ok: true }
      : {
          ok: false,
          reasonLabel: "Completa los módulos de la sesión antes de rendir el quiz.",
        };
  }

  let priorArchetypeResult: ArchetypeResult | undefined;
  if (evaluation.kind === "interest_onboarding") {
    const submitted = attempts
      .filter((a) => a.status === "submitted")
      .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
    if (submitted.length) {
      const priorAnswers = await repo.listAnswers(submitted[0].id);
      priorArchetypeResult =
        computeArchetypeResult(priorAnswers, optionsByQuestion, archetypes) ?? undefined;
    }
  }

  return {
    evaluation,
    questions,
    optionsByQuestion,
    outcomes,
    archetypes,
    priorArchetypeResult,
    gate,
    courseId: evaluation.courseId,
    modulesGate,
  };
}

/**
 * Revalida en el momento del envío que el intento sigue permitido (gate de
 * intentos + módulos previos completos). La UI ya oculta el formulario en
 * estos casos, pero esto evita que un envío disparado por otra vía (doble
 * clic, pestaña vieja reabierta, DevTools) registre un intento fuera de las
 * reglas — la barrera no vive solo en la UI.
 */
export async function canSubmitAttempt(
  repo: Repository,
  userId: string,
  evaluationId: string,
  nowIso: string,
): Promise<boolean> {
  const vm = await buildEvaluationView(repo, userId, evaluationId, nowIso);
  return vm.modulesGate.ok && vm.gate.canAttempt;
}

/**
 * Línea base por código de RA (del diagnóstico inicial ya rendido), para la
 * comparación pre/post del diagnóstico final (spec §5.4.1).
 */
export async function getBaselineByOutcomeCode(
  repo: Repository,
  userId: string,
  courseId: string,
): Promise<Record<string, number>> {
  const evaluations = await repo.listEvaluations(courseId);
  const diagInitial = evaluations.find((e) => e.kind === "diagnostic_initial");
  if (!diagInitial) return {};

  const attempts = await repo.listAttempts(userId, diagInitial.id);
  const submitted = attempts
    .filter((a) => a.status === "submitted")
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  if (!submitted.length) return {};

  const [scores, outcomes] = await Promise.all([
    repo.listOutcomeScores(submitted[0].id),
    repo.listOutcomes(diagInitial.id),
  ]);
  const codeById = new Map(outcomes.map((o) => [o.id, o.code]));

  const baseline: Record<string, number> = {};
  for (const s of scores) {
    const code = codeById.get(s.outcomeId);
    if (code) baseline[code] = s.achieved;
  }
  return baseline;
}
