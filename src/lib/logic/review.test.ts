import { describe, expect, it } from "vitest";
import { reviewModules } from "./review";
import type { Module, Session } from "@/lib/domain/types";

const sessions: Session[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `s${n}`,
  courseId: "c",
  order: n,
  title: `Sesión ${n}`,
}));

function mod(id: string, sessionId: string, order: number): Module {
  return { id, sessionId, context: "course", order, type: "video", title: id, description: "" };
}

const modulesBySession: Record<string, Module[]> = {
  s1: [mod("m1", "s1", 1)],
  s2: [mod("m2", "s2", 1)],
  s3: [mod("m3", "s3", 1)],
  s4: [mod("m4", "s4", 1)],
  s5: [mod("m5", "s5", 1)],
  s6: [mod("m6", "s6", 1)],
};

describe("reviewModules", () => {
  it("terminó la 4 → repaso de 4 y 3", () => {
    const completed = new Set(["m1", "m2", "m3", "m4"]);
    const r = reviewModules({ sessions, modulesBySession, completedModuleIds: completed });
    expect(r.lastCompletedOrder).toBe(4);
    expect(r.modules.map((m) => m.id).sort()).toEqual(["m3", "m4"]);
  });

  it("terminó la 6 → repaso de 6 y 5", () => {
    const completed = new Set(["m1", "m2", "m3", "m4", "m5", "m6"]);
    const r = reviewModules({ sessions, modulesBySession, completedModuleIds: completed });
    expect(r.lastCompletedOrder).toBe(6);
    expect(r.modules.map((m) => m.id).sort()).toEqual(["m5", "m6"]);
  });

  it("ninguna sesión completa → sin repaso", () => {
    const r = reviewModules({ sessions, modulesBySession, completedModuleIds: new Set() });
    expect(r.modules).toEqual([]);
  });

  it("solo la primera completa → repaso de la 1 (no hay N-1)", () => {
    const r = reviewModules({
      sessions,
      modulesBySession,
      completedModuleIds: new Set(["m1"]),
    });
    expect(r.lastCompletedOrder).toBe(1);
    expect(r.modules.map((m) => m.id)).toEqual(["m1"]);
  });
});
