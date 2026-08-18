import { describe, expect, it } from "vitest";
import { gradeAttempt, type GradeInput } from "./grading";
import type {
  Answer,
  LearningOutcome,
  Question,
  QuestionOption,
} from "@/lib/domain/types";

const outcomes: LearningOutcome[] = [
  { id: "ra1", evaluationId: "e", code: "RA1", name: "Teoría básica", expectedLevel: 60 },
  { id: "ra2", evaluationId: "e", code: "RA2", name: "Interpretación", expectedLevel: 70 },
];

const questions: Question[] = [
  { id: "q1", evaluationId: "e", order: 1, type: "single", text: "", points: 1, outcomeId: "ra1" },
  { id: "q2", evaluationId: "e", order: 2, type: "multiple", text: "", points: 1, outcomeId: "ra1" },
  { id: "q3", evaluationId: "e", order: 3, type: "open", text: "", points: 0, outcomeId: "ra2" },
  { id: "q4", evaluationId: "e", order: 4, type: "scale", text: "", points: 0, outcomeId: "ra2" },
];

const optionsByQuestion: Record<string, QuestionOption[]> = {
  q1: [
    { id: "o1a", questionId: "q1", text: "A", isCorrect: true },
    { id: "o1b", questionId: "q1", text: "B", isCorrect: false },
  ],
  q2: [
    { id: "o2a", questionId: "q2", text: "A", isCorrect: true },
    { id: "o2b", questionId: "q2", text: "B", isCorrect: true },
    { id: "o2c", questionId: "q2", text: "C", isCorrect: false },
  ],
};

function mk(answers: Answer[]): GradeInput {
  return { attemptId: "att", questions, optionsByQuestion, outcomes, answers };
}

describe("gradeAttempt", () => {
  it("califica opción única y múltiple; abierta no puntúa", () => {
    const res = gradeAttempt(
      mk([
        { id: "a1", attemptId: "att", questionId: "q1", selectedOptionIds: ["o1a"] },
        { id: "a2", attemptId: "att", questionId: "q2", selectedOptionIds: ["o2a", "o2b"] },
        { id: "a3", attemptId: "att", questionId: "q3", openText: "algo" },
      ]),
    );
    // 2 preguntas puntuables (q1, q2), ambas correctas → 100
    expect(res.score).toBe(100);
  });

  it("la opción múltiple exige el conjunto exacto", () => {
    const res = gradeAttempt(
      mk([
        { id: "a1", attemptId: "att", questionId: "q1", selectedOptionIds: ["o1a"] },
        { id: "a2", attemptId: "att", questionId: "q2", selectedOptionIds: ["o2a"] }, // incompleta
      ]),
    );
    // q1 correcta (1), q2 incorrecta (0) → 50
    expect(res.score).toBe(50);
  });

  it("desglosa por resultado de aprendizaje", () => {
    const res = gradeAttempt(
      mk([
        { id: "a1", attemptId: "att", questionId: "q1", selectedOptionIds: ["o1a"] },
        { id: "a2", attemptId: "att", questionId: "q2", selectedOptionIds: ["o2c"] }, // mal
      ]),
    );
    const ra1 = res.outcomeScores.find((o) => o.outcomeId === "ra1");
    // RA1 tiene q1 (bien) + q2 (mal) = 1/2 → 50, esperado 60
    expect(ra1).toEqual({ attemptId: "att", outcomeId: "ra1", expected: 60, achieved: 50 });
    // RA2 solo tiene abierta y escala-sin-valor → no aparece (no puntúa)
    expect(res.outcomeScores.find((o) => o.outcomeId === "ra2")).toBeUndefined();
  });

  it("pregunta sin outcomeId (quiz de tutorial) sí puntúa, sin aparecer en el desglose por RA", () => {
    const q: Question[] = [
      { id: "qt", evaluationId: "e", order: 1, type: "single", text: "", points: 1 },
    ];
    const opts: Record<string, QuestionOption[]> = {
      qt: [
        { id: "ota", questionId: "qt", text: "A", isCorrect: true },
        { id: "otb", questionId: "qt", text: "B", isCorrect: false },
      ],
    };
    const res = gradeAttempt({
      attemptId: "att",
      questions: q,
      optionsByQuestion: opts,
      outcomes: [],
      answers: [{ id: "a", attemptId: "att", questionId: "qt", selectedOptionIds: ["ota"] }],
    });
    expect(res.score).toBe(100);
    expect(res.outcomeScores).toHaveLength(0);
  });

  it("escala con valor esperado puntúa por tolerancia", () => {
    const q: Question[] = [
      { id: "qs", evaluationId: "e", order: 1, type: "scale", text: "", points: 2, outcomeId: "ra2", correctValue: 8, tolerance: 1 },
    ];
    const res = gradeAttempt({
      attemptId: "att",
      questions: q,
      optionsByQuestion: {},
      outcomes,
      answers: [{ id: "a", attemptId: "att", questionId: "qs", scaleValue: 7 }],
    });
    expect(res.score).toBe(100); // 7 está dentro de 8±1
  });
});
