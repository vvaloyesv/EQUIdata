"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { genId } from "@/lib/teacher/course";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ChallengeForm } from "@/components/teacher/ChallengeForm";
import type { ChallengeDifficulty } from "@/lib/domain/types";

const DIFFICULTY_TONE = {
  Básico: "lime",
  Intermedio: "lavender",
  Avanzado: "coral",
} as const;

export default function TeacherChallengesPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [adding, setAdding] = useState(false);

  const { data: challenges, loading } = useAsync(
    () => getRepository().listChallenges(),
    [reloadKey],
  );

  if (loading || !challenges) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  async function addChallenge(data: {
    title: string;
    description: string;
    difficulty: ChallengeDifficulty;
    contentHtml: string;
  }) {
    await getRepository().createChallenge({
      id: genId("ch"),
      createdAt: new Date().toISOString(),
      ...data,
    });
    setAdding(false);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Label>Contenido</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Retos
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
        Ejercicios cortos en HTML que se autocalifican: al terminar, tu HTML
        le reporta a EQUIdata cuántas respondió bien el estudiante.
      </p>

      <div className="mt-6 space-y-3">
        {challenges.map((challenge) => (
          <Card key={challenge.id} bordered>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy-tint)]">
                  <Target size={17} className="text-[var(--color-navy)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base text-[var(--color-navy)]">
                      {challenge.title}
                    </h3>
                    <Badge tone={DIFFICULTY_TONE[challenge.difficulty]}>
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-md text-sm text-[var(--color-muted)]">
                    {challenge.description}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {challenges.length === 0 && !adding && (
          <p className="text-sm text-[var(--color-hint)]">
            Sin retos todavía.
          </p>
        )}
      </div>

      <div className="mt-6">
        {adding ? (
          <ChallengeForm onSubmit={addChallenge} onCancel={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-[var(--color-lavender-text)] hover:underline"
          >
            + Agregar reto
          </button>
        )}
      </div>
    </div>
  );
}
