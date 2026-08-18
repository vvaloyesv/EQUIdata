import { describe, expect, it } from "vitest";
import { computeArchetypeResult } from "./archetype";
import type { Answer, Archetype, QuestionOption } from "@/lib/domain/types";

const archetypes: Archetype[] = [
  { id: "a-detalle", courseId: "c1", name: "Atenta al detalle", description: "…", order: 1 },
  { id: "a-entusiasta", courseId: "c1", name: "Entusiasta de los datos", description: "…", order: 2 },
];

const optionsByQuestion: Record<string, QuestionOption[]> = {
  q1: [
    { id: "q1-o1", questionId: "q1", text: "Reviso cada dato dos veces", archetypeId: "a-detalle" },
    { id: "q1-o2", questionId: "q1", text: "Me emociona encontrar un patrón", archetypeId: "a-entusiasta" },
  ],
  q2: [
    { id: "q2-o1", questionId: "q2", text: "Prefiero ir despacio y verificar", archetypeId: "a-detalle" },
    { id: "q2-o2", questionId: "q2", text: "Prefiero explorar rápido", archetypeId: "a-entusiasta" },
  ],
};

function answer(questionId: string, optionId: string): Answer {
  return { id: `ans-${questionId}`, attemptId: "att-1", questionId, selectedOptionIds: [optionId] };
}

describe("computeArchetypeResult", () => {
  it("el arquetipo con más opciones elegidas gana", () => {
    const answers = [answer("q1", "q1-o1"), answer("q2", "q2-o1")];
    const result = computeArchetypeResult(answers, optionsByQuestion, archetypes);
    expect(result?.archetypeId).toBe("a-detalle");
    expect(result?.scores).toEqual({ "a-detalle": 2, "a-entusiasta": 0 });
  });

  it("en empate gana el de menor order", () => {
    const answers = [answer("q1", "q1-o1"), answer("q2", "q2-o2")];
    const result = computeArchetypeResult(answers, optionsByQuestion, archetypes);
    expect(result?.archetypeId).toBe("a-detalle"); // order 1 < order 2
    expect(result?.scores).toEqual({ "a-detalle": 1, "a-entusiasta": 1 });
  });

  it("sin arquetipos definidos devuelve null", () => {
    expect(computeArchetypeResult([], optionsByQuestion, [])).toBeNull();
  });

  it("ignora respuestas sin selección y opciones sin archetypeId", () => {
    const noArchetypeOptions: Record<string, QuestionOption[]> = {
      q1: [{ id: "q1-o1", questionId: "q1", text: "Sin arquetipo" }],
    };
    const result = computeArchetypeResult(
      [answer("q1", "q1-o1")],
      noArchetypeOptions,
      archetypes,
    );
    expect(result?.scores).toEqual({ "a-detalle": 0, "a-entusiasta": 0 });
  });
});
