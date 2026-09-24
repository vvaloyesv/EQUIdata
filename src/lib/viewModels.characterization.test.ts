/**
 * Prueba de caracterización de los view-models (M10 · F4).
 *
 * Congela, con la semilla del MockRepository y una fecha fija, lo que cada
 * view-model entrega a su pantalla. F4 reescribe cómo se consultan los datos
 * (consultas en bloque en vez de bucles); esta prueba garantiza que lo que
 * ve la persona no cambia. Si un snapshot cambia, es un cambio de
 * comportamiento: revisarlo antes de aceptarlo con `vitest -u`.
 *
 * Normalización: `contentHtml` se omite (desde F4 las listas no lo traen;
 * se pide aparte al abrir el módulo), los `Set` se vuelven arrays ordenados
 * y los códigos de certificado recién emitidos (aleatorios) se enmascaran.
 */

import { describe, expect, it } from "vitest";
import { MockRepository } from "@/lib/data/mock/MockRepository";
import { NOW_ISO } from "@/lib/data/mock/seed";
import type { Repository } from "@/lib/data/repository";
import { buildDashboard, getStreakDays } from "@/lib/student/dashboard";
import { buildCourseView, getCourseCompletion, listAvailableCourses } from "@/lib/student/course";
import { buildEvaluationView, getBaselineByOutcomeCode } from "@/lib/student/evaluation";
import { buildCommunityFeed } from "@/lib/student/community";
import { buildConversations, getUnreadMessageCount } from "@/lib/student/messages";
import { syncAndListCertificates } from "@/lib/student/certificate";
import { buildChallengesView } from "@/lib/student/challenges";
import { buildTeacherDashboard } from "@/lib/teacher/dashboard";
import { buildGradesView } from "@/lib/teacher/grades";
import { buildStudentDetail } from "@/lib/teacher/students";
import { buildTeacherCourseView } from "@/lib/teacher/course";
import { buildTeacherQuizView } from "@/lib/teacher/quiz";
import { buildTeacherTutorialsView } from "@/lib/teacher/tutorials";
import {
  buildTeacherCourseRows,
  buildTeacherStudentRows,
  buildCourseProgressRows,
} from "@/lib/teacher/progress";

function normalize(value: unknown): unknown {
  if (value instanceof Set) return [...value].sort();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "contentHtml") continue;
      out[k] = normalize(v);
    }
    return out;
  }
  if (typeof value === "string" && /^EQUI-\d{4}-[A-Z0-9]{10}$/.test(value)) {
    return "EQUI-XXXX-RANDOM";
  }
  return value;
}

async function snap(fn: (repo: Repository) => Promise<unknown>) {
  const result = await fn(new MockRepository());
  expect(normalize(result)).toMatchSnapshot();
}

describe("view-models del estudiante", () => {
  it("dashboard", () => snap((r) => buildDashboard(r, "u-student", "Valentina", NOW_ISO)));
  it("dashboard sin progreso", () => snap((r) => buildDashboard(r, "u-s2", "Otra", NOW_ISO)));
  it("racha", () => snap((r) => getStreakDays(r, "u-student", NOW_ISO)));
  it("vista de curso — estadística", () =>
    snap((r) => buildCourseView(r, "u-student", "c-estadistica", NOW_ISO)));
  it("vista de curso — otra estudiante", () =>
    snap((r) => buildCourseView(r, "u-s2", "c-estadistica", NOW_ISO)));
  it("vista de curso — python", () =>
    snap((r) => buildCourseView(r, "u-student", "c-python", NOW_ISO)));
  it("avance de curso", () => snap((r) => getCourseCompletion(r, "u-student", "c-estadistica")));
  it("cursos disponibles", () => snap((r) => listAvailableCourses(r, "u-student")));
  it("evaluación — quiz", () => snap((r) => buildEvaluationView(r, "u-student", "e-quiz-s3", NOW_ISO)));
  it("evaluación — diagnóstico inicial", () =>
    snap((r) => buildEvaluationView(r, "u-student", "e-diag-ini", NOW_ISO)));
  it("evaluación — diagnóstico final", () =>
    snap((r) => buildEvaluationView(r, "u-student", "e-diag-fin", NOW_ISO)));
  it("línea base pre/post", () => snap((r) => getBaselineByOutcomeCode(r, "u-student", "c-estadistica")));
  it("comunidad", () => snap((r) => buildCommunityFeed(r, "u-student")));
  it("conversaciones", () => snap((r) => buildConversations(r, "u-student")));
  it("no leídos", () => snap((r) => getUnreadMessageCount(r, "u-student")));
  it("certificaciones", () => snap((r) => syncAndListCertificates(r, "u-student", NOW_ISO)));
  it("retos", () => snap((r) => buildChallengesView(r, "u-student")));
});

describe("view-models del profesor", () => {
  it("dashboard — todos los cursos", () => snap((r) => buildTeacherDashboard(r)));
  it("dashboard — un curso", () => snap((r) => buildTeacherDashboard(r, "c-estadistica")));
  it("calificaciones — quiz", () =>
    snap((r) => buildGradesView(r, "c-estadistica", "e-quiz-s3", NOW_ISO)));
  it("calificaciones — diagnóstico inicial", () =>
    snap((r) => buildGradesView(r, "c-estadistica", "e-diag-ini", NOW_ISO)));
  it("detalle de estudiante", () => snap((r) => buildStudentDetail(r, "u-student")));
  it("editor de curso", () => snap((r) => buildTeacherCourseView(r, "c-estadistica")));
  it("constructor de quiz", () => snap((r) => buildTeacherQuizView(r, "e-quiz-s3")));
  it("tutoriales", () => snap((r) => buildTeacherTutorialsView(r)));
  it("lista de cursos", () => snap((r) => buildTeacherCourseRows(r)));
  it("directorio de estudiantes", () => snap((r) => buildTeacherStudentRows(r)));
  it("progreso por curso", () => snap((r) => buildCourseProgressRows(r, "c-estadistica")));
});
