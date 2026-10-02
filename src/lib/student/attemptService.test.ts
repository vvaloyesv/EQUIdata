import { describe, expect, it } from "vitest";
import { MockRepository } from "@/lib/data/mock/MockRepository";
import {
  ANSWER_GRACE_SECONDS,
  AttemptError,
  beginAttempt,
  completeAttempt,
  recordAttemptAnswer,
  sanitizeAnswer,
  submitAttemptAnswers,
} from "./attemptService";
import { QUESTION_SECONDS } from "@/lib/logic/timedQuiz";
import type { Question } from "@/lib/domain/types";

const STUDENT = "u-student";
const QUIZ = "e-quiz-s3"; // cronometrado: q1 (única), q2 (múltiple), q3 (abierta), q4 (escala)

/** Repo con los módulos de la sesión 3 completos (el quiz exige eso para rendir). */
async function readyRepo() {
  const repo = new MockRepository();
  for (const m of await repo.listModules("s3")) {
    await repo.setModuleProgress({
      userId: STUDENT,
      moduleId: m.id,
      completed: true,
      completedAt: "2026-09-01T00:00:00.000Z",
    });
  }
  return repo;
}

const at = (base: string, seconds: number) => new Date(new Date(base).getTime() + seconds * 1000);

async function expectError(promise: Promise<unknown>, status: number) {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(AttemptError);
  expect((error as AttemptError).status).toBe(status);
}

describe("intentos calificados en el servidor (Seguridad, Fase 1)", () => {
  it("califica el servidor con las claves: la nota no la decide quien responde", async () => {
    const repo = await readyRepo();
    const attempt = await beginAttempt(repo, STUDENT, QUIZ);
    await recordAttemptAnswer(repo, STUDENT, attempt.id, "q1", { selectedOptionIds: ["o1a"] });
    await recordAttemptAnswer(repo, STUDENT, attempt.id, "q2", { selectedOptionIds: ["o2c"] });
    const result = await completeAttempt(repo, STUDENT, attempt.id);
    // q1 bien (1 pt), q2 mal (0 pt): 1 de 2 puntos calificables.
    expect(result.score).toBe(50);
    const saved = await repo.getAttempt(attempt.id);
    expect(saved?.status).toBe("submitted");
    expect(saved?.score).toBe(50);
  });

  it("cerrar dos veces devuelve la misma nota (idempotente)", async () => {
    const repo = await readyRepo();
    const attempt = await beginAttempt(repo, STUDENT, QUIZ);
    await recordAttemptAnswer(repo, STUDENT, attempt.id, "q1", { selectedOptionIds: ["o1a"] });
    const first = await completeAttempt(repo, STUDENT, attempt.id);
    const second = await completeAttempt(repo, STUDENT, attempt.id);
    expect(second.score).toBe(first.score);
  });

  it("cada pregunta se responde una sola vez (no hay vuelta atrás)", async () => {
    const repo = await readyRepo();
    const attempt = await beginAttempt(repo, STUDENT, QUIZ);
    await recordAttemptAnswer(repo, STUDENT, attempt.id, "q1", { selectedOptionIds: ["o1b"] });
    await expectError(
      recordAttemptAnswer(repo, STUDENT, attempt.id, "q1", { selectedOptionIds: ["o1a"] }),
      409,
    );
  });

  it("rechaza respuestas fuera de tiempo, medido con la hora del servidor", async () => {
    const repo = await readyRepo();
    const attempt = await beginAttempt(repo, STUDENT, QUIZ);
    const limitQ1 = QUESTION_SECONDS + ANSWER_GRACE_SECONDS;
    await expectError(
      recordAttemptAnswer(repo, STUDENT, attempt.id, "q1", { selectedOptionIds: ["o1a"] }, at(attempt.startedAt, limitQ1 + 1)),
      409,
    );
    // La pregunta 2 tiene hasta 2 × 45 s + margen desde el inicio.
    await recordAttemptAnswer(
      repo,
      STUDENT,
      attempt.id,
      "q2",
      { selectedOptionIds: ["o2a"] },
      at(attempt.startedAt, 2 * QUESTION_SECONDS),
    );
  });

  it("no deja tocar el intento de otra persona", async () => {
    const repo = await readyRepo();
    const attempt = await beginAttempt(repo, STUDENT, QUIZ);
    await expectError(
      recordAttemptAnswer(repo, "u-s2", attempt.id, "q1", { selectedOptionIds: ["o1a"] }),
      404,
    );
    await expectError(completeAttempt(repo, "u-s2", attempt.id), 404);
  });

  it("no abre intentos de más", async () => {
    const repo = await readyRepo();
    // maxAttempts del quiz = 2; un intento abierto también cuenta.
    await beginAttempt(repo, STUDENT, QUIZ);
    await beginAttempt(repo, STUDENT, QUIZ);
    await expectError(beginAttempt(repo, STUDENT, QUIZ), 409);
  });

  it("no responde en un intento ya cerrado", async () => {
    const repo = await readyRepo();
    const attempt = await beginAttempt(repo, STUDENT, QUIZ);
    await completeAttempt(repo, STUDENT, attempt.id);
    await expectError(
      recordAttemptAnswer(repo, STUDENT, attempt.id, "q1", { selectedOptionIds: ["o1a"] }),
      409,
    );
  });

  it("un quiz cronometrado no se puede mandar completo de una vez", async () => {
    const repo = await readyRepo();
    await expectError(
      submitAttemptAnswers(repo, STUDENT, QUIZ, { q1: { selectedOptionIds: ["o1a"] } }),
      400,
    );
  });

  it("diagnóstico sin cronómetro: califica el servidor y respeta el tope de intentos", async () => {
    const repo = new MockRepository();
    // u-s2 no rindió el diagnóstico final (máximo 2 intentos por tanda).
    const result = await submitAttemptAnswers(repo, "u-s2", "e-diag-fin", {
      qf1: { selectedOptionIds: ["of1a"] },
      qf2: { selectedOptionIds: ["of2a", "of2b"] },
      qf3: { openText: "Cuando hay valores extremos." },
    });
    expect(result.score).toBeGreaterThan(0);
    const attempts = await repo.listAttempts("u-s2", "e-diag-fin");
    expect(attempts.find((a) => a.id === result.attemptId)?.score).toBe(result.score);
  });

  it("limpia lo que llega del navegador", () => {
    const single = { id: "q", type: "single" } as Question;
    const options = [
      { id: "a", questionId: "q", text: "A" },
      { id: "b", questionId: "q", text: "B" },
    ];
    expect(sanitizeAnswer(single, options, { selectedOptionIds: ["x", "b", "a"] })).toEqual({
      selectedOptionIds: ["b"],
    });
    expect(sanitizeAnswer({ ...single, type: "scale" } as Question, [], { scaleValue: 99 })).toEqual({
      scaleValue: 10,
    });
    expect(
      sanitizeAnswer({ ...single, type: "open" } as Question, [], { openText: "x".repeat(6000) }).openText,
    ).toHaveLength(5000);
  });
});
