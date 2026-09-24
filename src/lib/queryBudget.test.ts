/**
 * Presupuesto de consultas por pantalla (M10 · F4).
 *
 * Cada llamada al repositorio es una ida y vuelta a Supabase (~130 ms desde
 * Colombia). Estas pruebas fallan si un view-model vuelve a consultar
 * dentro de un bucle — por sesión, por estudiante, por pregunta — que fue la
 * causa de la lentitud medida el 24/09/2026 (hasta 600+ consultas en el
 * dashboard del profesor). Dos reglas:
 *   1. Tope fijo de llamadas por view-model, igual para 1 o 100 sesiones.
 *   2. Ningún método se llama más de una vez en el mismo armado (eso es un
 *      bucle de consultas), salvo las excepciones listadas.
 */

import { describe, expect, it } from "vitest";
import { MockRepository } from "@/lib/data/mock/MockRepository";
import { NOW_ISO } from "@/lib/data/mock/seed";
import type { Repository } from "@/lib/data/repository";
import { buildDashboard } from "@/lib/student/dashboard";
import { buildCourseView } from "@/lib/student/course";
import { buildEvaluationView } from "@/lib/student/evaluation";
import { buildCommunityFeed } from "@/lib/student/community";
import { buildConversations } from "@/lib/student/messages";
import { syncAndListCertificates } from "@/lib/student/certificate";
import { buildTeacherDashboard } from "@/lib/teacher/dashboard";
import { buildGradesView } from "@/lib/teacher/grades";
import { buildStudentDetail } from "@/lib/teacher/students";
import { buildTeacherCourseView } from "@/lib/teacher/course";
import { buildTeacherQuizView } from "@/lib/teacher/quiz";
import { buildTeacherTutorialsView } from "@/lib/teacher/tutorials";
import {
  buildCourseProgressRows,
  buildTeacherCourseRows,
  buildTeacherStudentRows,
} from "@/lib/teacher/progress";

function counting(repo: Repository) {
  const calls: string[] = [];
  const proxy = new Proxy(repo, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        calls.push(String(prop));
        return value.apply(target, args);
      };
    },
  });
  return { repo: proxy as Repository, calls };
}

async function measure(fn: (repo: Repository) => Promise<unknown>) {
  const { repo, calls } = counting(new MockRepository());
  await fn(repo);
  const repeated = [...new Set(calls)].filter((m) => calls.filter((c) => c === m).length > 1);
  return { total: calls.length, repeated };
}

const CASES: Array<[string, (repo: Repository) => Promise<unknown>, number]> = [
  ["dashboard del estudiante", (r) => buildDashboard(r, "u-student", "V", NOW_ISO), 5],
  ["vista de curso", (r) => buildCourseView(r, "u-student", "c-estadistica", NOW_ISO), 4],
  ["evaluación (quiz de sesión)", (r) => buildEvaluationView(r, "u-student", "e-quiz-s3", NOW_ISO), 6],
  ["comunidad", (r) => buildCommunityFeed(r, "u-student"), 1],
  ["conversaciones", (r) => buildConversations(r, "u-student"), 2],
  ["certificaciones", (r) => syncAndListCertificates(r, "u-student", NOW_ISO), 9],
  ["dashboard del profesor", (r) => buildTeacherDashboard(r), 6],
  ["calificaciones", (r) => buildGradesView(r, "c-estadistica", "e-quiz-s3", NOW_ISO), 7],
  ["detalle de estudiante", (r) => buildStudentDetail(r, "u-student"), 6],
  ["editor de curso", (r) => buildTeacherCourseView(r, "c-estadistica"), 3],
  ["constructor de quiz", (r) => buildTeacherQuizView(r, "e-quiz-s3"), 3],
  ["tutoriales del profesor", (r) => buildTeacherTutorialsView(r), 2],
  ["lista de cursos (profesor)", (r) => buildTeacherCourseRows(r), 4],
  ["directorio de estudiantes", (r) => buildTeacherStudentRows(r), 5],
  ["progreso por curso", (r) => buildCourseProgressRows(r, "c-estadistica"), 4],
];

/** Llamadas que pueden repetirse sin ser un bucle: releer la lista tras emitir certificados. */
const ALLOWED_REPEATS: Record<string, string[]> = {
  certificaciones: ["listCertificates"],
};

describe("presupuesto de consultas por pantalla", () => {
  for (const [name, fn, budget] of CASES) {
    it(`${name}: ≤ ${budget} consultas y ninguna en bucle`, async () => {
      const { total, repeated } = await measure(fn);
      expect(total).toBeLessThanOrEqual(budget);
      expect(repeated.filter((m) => !(ALLOWED_REPEATS[name] ?? []).includes(m))).toEqual([]);
    });
  }
});
