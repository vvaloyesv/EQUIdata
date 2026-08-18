"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildGradesView } from "@/lib/teacher/grades";
import { gradesToCsv, type GradeRow } from "@/lib/logic/grades-csv";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/LockedState";

const KIND_LABEL: Record<string, string> = {
  diagnostic_initial: "Diagnóstico inicial",
  quiz: "Quiz",
  diagnostic_final: "Diagnóstico final",
};

export default function TeacherGradesPage() {
  const { data: courses } = useAsync(() => getRepository().listCourses(), []);
  const [courseId, setCourseId] = useState<string>();
  const activeCourseId = courseId ?? courses?.[0]?.id;

  const { data: evaluations } = useAsync(
    () => (activeCourseId ? getRepository().listEvaluations(activeCourseId) : Promise.resolve([])),
    [activeCourseId],
  );
  const [evalId, setEvalId] = useState<string>();
  const activeEvalId = evalId ?? evaluations?.[0]?.id;

  const [reloadKey, setReloadKey] = useState(0);
  const { data: vm, loading } = useAsync(async () => {
    if (!activeCourseId || !activeEvalId) return null;
    return buildGradesView(getRepository(), activeCourseId, activeEvalId, new Date().toISOString());
  }, [activeCourseId, activeEvalId, reloadKey]);

  async function reopen(userId: string) {
    if (!activeEvalId) return;
    await getRepository().grantBonusAttempt(userId, activeEvalId);
    setReloadKey((k) => k + 1);
  }

  function exportCsv() {
    if (!vm) return;
    const outcomeCodes = vm.outcomes.map((o) => o.code);
    const rows: GradeRow[] = vm.rows.map((r) => ({
      studentName: r.student.displayName,
      email: r.student.email,
      evaluationTitle: vm.evaluation.title,
      score: r.bestScore ?? null,
      outcomeAchieved: r.outcomeAchieved,
      outcomeExpected: Object.fromEntries(vm.outcomes.map((o) => [o.code, o.expectedLevel])),
      questionAnswers: r.questionAnswers,
    }));
    const csv = gradesToCsv(rows, outcomeCodes, vm.questionLabels);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vm.evaluation.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!courses) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Label>Resultados</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Calificaciones
      </h1>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label>
            <Label>Curso</Label>
          </label>
          <select
            value={activeCourseId ?? ""}
            onChange={(e) => {
              setCourseId(e.target.value);
              setEvalId(undefined);
            }}
            className="rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label>
            <Label>Evaluación</Label>
          </label>
          <select
            value={activeEvalId ?? ""}
            onChange={(e) => setEvalId(e.target.value)}
            className="rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-navy)] focus-ring"
          >
            {(evaluations ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {KIND_LABEL[e.kind]} · {e.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {evaluations && evaluations.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Este curso no tiene evaluaciones todavía" />
        </div>
      ) : loading || !vm ? (
        <div className="mt-6 h-6 w-32 animate-pulse rounded bg-[var(--color-divider)]" />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <Label>
              {vm.rows.length} estudiante{vm.rows.length !== 1 && "s"}
            </Label>
            <Button variant="secondary" className="!px-3.5 !py-1.5 text-xs" onClick={exportCsv}>
              <Download size={13} /> Exportar CSV
            </Button>
          </div>

          <Card bordered className="mt-3 overflow-x-auto !p-0">
            {vm.rows.length === 0 ? (
              <EmptyState title="Nadie inscrito en este curso todavía" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-divider)] text-left">
                    <th className="px-4 py-3">
                      <Label>Estudiante</Label>
                    </th>
                    <th className="px-4 py-3">
                      <Label>Nota</Label>
                    </th>
                    {vm.outcomes.map((o) => (
                      <th key={o.id} className="px-4 py-3">
                        <Label>{o.code}</Label>
                      </th>
                    ))}
                    <th className="px-4 py-3">
                      <Label>Acción</Label>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vm.rows.map((r) => (
                    <tr key={r.student.id} className="border-b border-[var(--color-divider)] last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.student.displayName} size={28} />
                          <span className="text-[var(--color-navy)]">{r.student.displayName}</span>
                        </div>
                        {r.openAnswers.length > 0 && (
                          <details className="mt-1.5 ml-9">
                            <summary className="cursor-pointer text-xs text-[var(--color-lavender-text)]">
                              Ver respuesta{r.openAnswers.length > 1 && "s"} abierta{r.openAnswers.length > 1 && "s"}
                            </summary>
                            <div className="mt-1 space-y-1 text-xs text-[var(--color-muted)]">
                              {r.openAnswers.map((a, i) => (
                                <p key={i}>
                                  <span className="font-medium text-[var(--color-navy)]">{a.question}:</span>{" "}
                                  {a.answer}
                                </p>
                              ))}
                            </div>
                          </details>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.bestScore === undefined ? (
                          <Label>Sin intentos</Label>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-display tabular text-[var(--color-navy)]">
                              {r.bestScore}%
                            </span>
                            {vm.evaluation.passingScore !== undefined &&
                              (r.passed ? (
                                <Badge tone="lime">Aprobado</Badge>
                              ) : (
                                <Badge tone="coral">No aprobado</Badge>
                              ))}
                          </div>
                        )}
                      </td>
                      {vm.outcomes.map((o) => (
                        <td key={o.id} className="px-4 py-3">
                          {r.outcomeAchieved[o.code] !== undefined ? (
                            <span
                              className={
                                r.outcomeAchieved[o.code] >= o.expectedLevel
                                  ? "text-[var(--color-lime-text)]"
                                  : "text-[var(--color-coral)]"
                              }
                            >
                              {r.outcomeAchieved[o.code]}%
                            </span>
                          ) : (
                            <span className="text-[var(--color-hint)]">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {r.canReopen && (
                          <button
                            onClick={() => reopen(r.student.id)}
                            className="flex items-center gap-1 text-xs text-[var(--color-lavender-text)] hover:underline"
                          >
                            <RotateCcw size={12} /> Reabrir intento
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
