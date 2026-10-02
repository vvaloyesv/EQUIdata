"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { queryKeys, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildChallengesView } from "@/lib/student/challenges";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/LockedState";
import { PageBody, PageHeader } from "@/components/ui/Page";

const DIFFICULTY_LEVEL = { Básico: 1, Intermedio: 2, Avanzado: 3 } as const;

export default function ChallengesPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: challenges, loading } = useRepoQuery(
    queryKeys.challenges(userId),
    () => buildChallengesView(getRepository(), userId),
    { enabled: !!user },
  );

  const done = (challenges ?? []).filter((c) => c.bestAttempt).length;

  return (
    <div>
      <PageHeader
        eyebrow={
          challenges ? `${challenges.length} ${challenges.length === 1 ? "reto" : "retos"} · ${done} ${done === 1 ? "resuelto" : "resueltos"}` : "Retos"
        }
        title="Retos"
        description="Ejercicios cortos para poner a prueba lo que vas aprendiendo, con datos reales de la Fundación."
      />
      <PageBody>
      <div className="space-y-3">
        {loading ? (
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-divider)]" />
        ) : !challenges || challenges.length === 0 ? (
          <EmptyState
            title="Todavía no hay retos."
            hint="Cuando tu profesora publique uno, aparecerá aquí."
          />
        ) : (
          challenges.map(({ challenge, bestAttempt }) => (
            <Link key={challenge.id} href={`/challenges/${challenge.id}`} className="block">
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
                        <span
                          className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--color-muted)]"
                          title={`Dificultad: ${challenge.difficulty}`}
                        >
                          <span className="flex gap-0.5" aria-hidden>
                            {[1, 2, 3].map((n) => (
                              <span
                                key={n}
                                className={
                                  n <= DIFFICULTY_LEVEL[challenge.difficulty]
                                    ? "h-2.5 w-1 rounded-full bg-[var(--color-navy)]"
                                    : "h-2.5 w-1 rounded-full bg-[var(--color-divider)]"
                                }
                              />
                            ))}
                          </span>
                          {challenge.difficulty}
                        </span>
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
      </PageBody>
    </div>
  );
}
