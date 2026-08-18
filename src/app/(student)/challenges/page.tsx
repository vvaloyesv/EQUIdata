"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildChallengesView } from "@/lib/student/challenges";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/LockedState";

const DIFFICULTY_TONE = {
  Básico: "lime",
  Intermedio: "lavender",
  Avanzado: "coral",
} as const;

export default function ChallengesPage() {
  const { user } = useAuth();
  const { data: challenges, loading } = useAsync(
    () =>
      user
        ? buildChallengesView(getRepository(), user.id)
        : Promise.resolve([]),
    [user?.id],
  );

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Label>Practica con propósito</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Retos
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
        Ejercicios cortos para poner a prueba lo que vas aprendiendo, con
        datos reales de la Fundación.
      </p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-divider)]" />
        ) : !challenges || challenges.length === 0 ? (
          <EmptyState
            title="Todavía no hay retos"
            hint="Tu profesor los va a ir agregando."
          />
        ) : (
          challenges.map(({ challenge, bestAttempt }) => (
            <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
              <Card
                bordered
                className="transition-colors hover:border-[var(--color-lavender)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
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
                  <div className="shrink-0 text-right">
                    {bestAttempt ? (
                      <Badge tone="lime">
                        Mejor: {bestAttempt.score}/{bestAttempt.total}
                      </Badge>
                    ) : (
                      <Badge tone="locked">Sin intentar</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
