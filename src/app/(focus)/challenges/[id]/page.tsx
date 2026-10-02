"use client";

import { use, useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { queryKeys, useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildChallengesView } from "@/lib/student/challenges";
import { ChallengeViewer } from "@/components/student/ChallengeViewer";
import { FocusTopBar } from "@/components/student/FocusTopBar";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export default function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const refresh = useRefresh();
  const [attemptKey, setAttemptKey] = useState(0);
  const [justCompleted, setJustCompleted] = useState<{
    score: number;
    total: number;
  } | null>(null);
  const userId = user?.id ?? "";

  // Misma lectura que la lista de Retos: si se viene de ahí, aparece al instante.
  const { data: views, loading } = useRepoQuery(
    queryKeys.challenges(userId),
    () => buildChallengesView(getRepository(), userId),
    { enabled: !!user },
  );
  const data = views?.find((v) => v.challenge.id === id) ?? null;

  const handleResult = useCallback(
    async (score: number, total: number) => {
      if (!user) return;
      await getRepository().createChallengeAttempt({
        id: `cha-${crypto.randomUUID()}`,
        userId: user.id,
        challengeId: id,
        score,
        total,
        completedAt: new Date().toISOString(),
      });
      setJustCompleted({ score, total });
      await refresh();
    },
    [id, user, refresh],
  );

  function retry() {
    setJustCompleted(null);
    setAttemptKey((k) => k + 1);
  }

  if (loading || !data) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { challenge, attemptCount, bestAttempt } = data;
  const shown = justCompleted ?? bestAttempt;

  return (
    <div>
      <FocusTopBar
        backHref="/challenges"
        backLabel="Retos"
        crumbs={[challenge.title]}
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          <h1 className="font-display text-2xl text-[var(--color-navy)]">
            {challenge.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {challenge.description}
          </p>
        </div>

        {shown && (
          <Card bordered className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Label className={shown.score === shown.total ? "text-[var(--color-lime-text)]" : undefined}>
                {justCompleted ? "Resultado de este intento" : "Tu mejor intento"} · {attemptCount}{" "}
                {attemptCount === 1 ? "intento" : "intentos"}
              </Label>
              <p className="mt-1 font-display text-3xl tabular-nums text-[var(--color-navy)]">
                {shown.score}
                <span className="text-lg text-[var(--color-muted)]"> / {shown.total}</span>
              </p>
            </div>
            <Button variant="secondary" onClick={retry}>
              <RefreshCw size={15} /> Reintentar
            </Button>
          </Card>
        )}

        <ChallengeViewer
          challenge={challenge}
          attemptKey={attemptKey}
          onResult={handleResult}
        />
      </div>
    </div>
  );
}
