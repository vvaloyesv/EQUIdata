import { describe, expect, it } from "vitest";
import { generateCertificateCode } from "./certificate";
import { MockRepository } from "@/lib/data/mock/MockRepository";
import type { Certificate } from "@/lib/domain/types";

describe("generateCertificateCode", () => {
  it("cumple el patrón EQUI-<año>-<10 alfanum>", () => {
    const code = generateCertificateCode("2026-08-15T00:00:00.000Z");
    expect(code).toMatch(/^EQUI-2026-[A-Z0-9]{10}$/);
  });

  it("toma el año de la fecha de emisión", () => {
    expect(generateCertificateCode("2027-01-01T00:00:00.000Z")).toMatch(
      /^EQUI-2027-/,
    );
  });
});

describe("issueCertificate (idempotencia)", () => {
  // userId/courseId deben existir en el repo: issueCertificate valida
  // integridad referencial antes de emitir.
  const base: Certificate = {
    code: "EQUI-2026-AAAAA",
    userId: "u-student",
    courseId: "c-estadistica",
    studentName: "Test User",
    courseTitle: "Curso X",
    courseDescription: "…",
    teacherName: "Profe",
    durationMin: 60,
    issuedAt: "2026-08-15T00:00:00.000Z",
  };

  it("no duplica ni cambia el código para el mismo userId+courseId", async () => {
    const repo = new MockRepository();
    const first = await repo.issueCertificate(base);
    const second = await repo.issueCertificate({
      ...base,
      code: "EQUI-2026-BBBBB", // intento de re-emitir con otro código
    });
    expect(second.code).toBe(first.code);
    const all = await repo.listCertificates("u-student");
    expect(all).toHaveLength(1);
  });
});
