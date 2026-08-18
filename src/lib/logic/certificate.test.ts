import { describe, expect, it } from "vitest";
import { isCertificateEligible } from "./certificate";

describe("isCertificateEligible", () => {
  it("elegible: aprobó final + curso completo", () => {
    expect(
      isCertificateEligible({
        finalBestScore: 85,
        finalPassingScore: 80,
        totalModules: 5,
        completedModules: 5,
      }).eligible,
    ).toBe(true);
  });

  it("no elegible si no completó el curso", () => {
    const r = isCertificateEligible({
      finalBestScore: 90,
      finalPassingScore: 80,
      totalModules: 5,
      completedModules: 3,
    });
    expect(r.eligible).toBe(false);
    expect(r.reasonLabel).toMatch(/módulos/i);
  });

  it("no elegible si no aprobó el final", () => {
    const r = isCertificateEligible({
      finalBestScore: 70,
      finalPassingScore: 80,
      totalModules: 5,
      completedModules: 5,
    });
    expect(r.eligible).toBe(false);
    expect(r.reasonLabel).toMatch(/diagnóstico final/i);
  });

  it("no elegible si aún no rinde el final", () => {
    const r = isCertificateEligible({
      finalBestScore: undefined,
      finalPassingScore: 80,
      totalModules: 5,
      completedModules: 5,
    });
    expect(r.eligible).toBe(false);
  });
});
