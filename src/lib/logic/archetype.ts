/**
 * Onboarding de intereses por curso: no es de conocimiento, no se califica.
 * Cada opción elegida suma un punto a su `archetypeId`; el arquetipo con más
 * puntos gana (empate → el de menor `order`, definido por el profesor).
 */

import type { Answer, Archetype, QuestionOption } from "@/lib/domain/types";

export interface ArchetypeResult {
  archetypeId: string;
  scores: Record<string, number>;
}

export function computeArchetypeResult(
  answers: Answer[],
  optionsByQuestion: Record<string, QuestionOption[]>,
  archetypes: Archetype[],
): ArchetypeResult | null {
  if (archetypes.length === 0) return null;

  const scores: Record<string, number> = {};
  for (const a of archetypes) scores[a.id] = 0;

  for (const answer of answers) {
    const options = optionsByQuestion[answer.questionId] ?? [];
    const chosenIds = new Set(answer.selectedOptionIds ?? []);
    for (const option of options) {
      if (!option.archetypeId) continue;
      if (chosenIds.has(option.id) && scores[option.archetypeId] !== undefined) {
        scores[option.archetypeId] += 1;
      }
    }
  }

  const ordered = [...archetypes].sort((a, b) => a.order - b.order);
  let winner = ordered[0];
  for (const a of ordered) {
    if (scores[a.id] > scores[winner.id]) winner = a;
  }

  return { archetypeId: winner.id, scores };
}
