import { describe, expect, it } from "vitest";
import type { CourseStructure, Module, Session } from "@/lib/domain/types";
import { courseCompletion } from "./course";

function mod(id: string, sessionId: string): Module {
  return { id, sessionId, context: "course", order: 1, type: "video", title: id, description: "" };
}
function session(id: string, order: number): Session {
  return { id, courseId: "c", order, title: `Sesión ${order}` };
}

/** 5 sesiones: 3 + 1 + 2 + 1 módulos y la última todavía sin módulos (como en Estadística). */
const structure = {
  course: { id: "c" },
  sessions: [session("s1", 1), session("s2", 2), session("s3", 3), session("s4", 4), session("s5", 5)],
  modulesBySession: {
    s1: [mod("a", "s1"), mod("b", "s1"), mod("c", "s1")],
    s2: [mod("d", "s2")],
    s3: [mod("e", "s3"), mod("f", "s3")],
    s4: [mod("g", "s4")],
    s5: [],
  },
  evaluations: [],
} as unknown as CourseStructure;

describe("avance del curso sobre todas las sesiones", () => {
  it("todo lo liberado hecho y la última sesión vacía: 80 %, no 100 %", () => {
    const done = new Set(["a", "b", "c", "d", "e", "f", "g"]);
    const r = courseCompletion(structure, done);
    expect(r.completed).toBe(7);
    expect(r.total).toBe(7);
    expect(r.percent).toBe(80);
  });

  it("cada sesión pesa igual, sin importar cuántos módulos tenga", () => {
    // Solo la sesión 2 (1 módulo) completa: 1 de 5 sesiones → 20 %.
    expect(courseCompletion(structure, new Set(["d"])).percent).toBe(20);
    // La mitad de la sesión 3 → 10 %.
    expect(courseCompletion(structure, new Set(["e"])).percent).toBe(10);
  });

  it("sin nada hecho, 0 %", () => {
    expect(courseCompletion(structure, new Set()).percent).toBe(0);
  });
});
