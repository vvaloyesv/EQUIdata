import { describe, expect, it } from "vitest";
import { recordChallengeAttempt } from "./challenges";
import { AttemptError } from "./attemptService";
import { MockRepository } from "@/lib/data/mock/MockRepository";

const NOW = "2026-10-02T15:00:00.000Z";

describe("recordChallengeAttempt (lo que guarda el servidor)", () => {
  it("toma quién y cuándo del servidor, no del navegador", async () => {
    const repo = new MockRepository();
    const saved = await recordChallengeAttempt(
      repo,
      "u-student",
      { challengeId: "ch-tendencia-central", score: 3, total: 5 },
      NOW,
    );
    expect(saved).toMatchObject({ userId: "u-student", score: 3, total: 5, completedAt: NOW });
    expect(await repo.listChallengeAttempts("u-student")).toContainEqual(saved);
  });

  it("acota el puntaje entre 0 y el total", async () => {
    const repo = new MockRepository();
    const high = await recordChallengeAttempt(
      repo,
      "u-student",
      { challengeId: "ch-tendencia-central", score: 999, total: 5 },
      NOW,
    );
    const low = await recordChallengeAttempt(
      repo,
      "u-student",
      { challengeId: "ch-tendencia-central", score: -4, total: 5 },
      NOW,
    );
    expect(high.score).toBe(5);
    expect(low.score).toBe(0);
  });

  it("rechaza resultados inválidos y retos que no existen", async () => {
    const repo = new MockRepository();
    const bad = (input: { challengeId: unknown; score: unknown; total: unknown }) =>
      recordChallengeAttempt(repo, "u-student", input, NOW);

    await expect(bad({ challengeId: "ch-tendencia-central", score: 1, total: 0 })).rejects.toBeInstanceOf(AttemptError);
    await expect(bad({ challengeId: "ch-tendencia-central", score: "x", total: 5 })).rejects.toBeInstanceOf(AttemptError);
    await expect(bad({ challengeId: "", score: 1, total: 5 })).rejects.toBeInstanceOf(AttemptError);
    await expect(bad({ challengeId: "ch-no-existe", score: 1, total: 5 })).rejects.toMatchObject({ status: 404 });
  });
});
