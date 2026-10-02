"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { queryKeys, useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildGradesView } from "@/lib/teacher/grades";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/LockedState";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { Select } from "@/components/ui/Input";
import { ScoreStrip } from "@/components/ui/Charts";

const KIND_LABEL: Record<string, string> = {
  diagnostic_initial: "Diagnóstico inicial",
  quiz: "Quiz",
  diagnostic_final: "Diagnóstico final",
};

export default function TeacherGradesPage() {
  const refresh = useRefresh();
  const { data: courses } = useRepoQuery(queryKeys.courses(), () => getRepository().listCourses());
  const [courseId, setCourseId] = useState<string>();
  const activeCourseId = courseId ?? courses?.[0]?.id;

  const { data: evaluations } = useRepoQuery(
    ["evaluations", activeCourseId ?? ""],
    () => getRepository().listEvaluations(activeCourseId!),
    { enabled: !!activeCourseId },
  );
  const [evalId, setEvalId] = useState<string>();
  // Solo vale una evaluación del curso elegido (evita pedir la de otro curso al cambiar).
  const activeEvalId =
    evaluations?.find((e) => e.id === evalId)?.id ?? evaluations?.[0]?.id;

  const { data: vm, loading } = useRepoQuery(
    ["grades", activeCourseId ?? "", activeEvalId ?? ""],
    () =>
      buildGradesView(getRepository(), activeCourseId!, activeEvalId!, new Date().toISOString()),
    { enabled: !!activeCourseId && !!activeEvalId },
  );

  async function reopen(userId: string) {
    if (!activeEvalId) return;
    await getRepository().grantBonusAttempt(userId, activeEvalId);
    await refresh();
  }

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string>();

  /** El CSV lo arma el servidor (con su propio control de permisos); aquí solo se descarga. */
  async function exportCsv() {
    if (!activeCourseId || !activeEvalId) return;
    setExporting(true);
    setExportError(undefined);
    try {
      const res = await fetch(
        `/api/teacher/grades/export?courseId=${encodeURIComponent(activeCourseId)}&evaluationId=${encodeURIComponent(activeEvalId)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setExportError(body.error ?? "No se pudo exportar. Intenta de nuevo.");
        return;
      }
      const filename =
        /filename\*=UTF-8''([^;]+)/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ??
        "calificaciones.csv";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(filename);
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
    } finally {
      setExporting(false);
    }
  }

  if (!courses) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Resultados por evaluación"
        title="Calificaciones"
        description="Notas por estudiante y por resultado de aprendizaje. Desde aquí reabres intentos y exportas el CSV."
      />
      <PageBody>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          id="grades-course"
          label="Curso"
          value={activeCourseId ?? ""}
          onChange={(e) => {
            setCourseId(e.target.value);
            setEvalId(undefined);
          }}
          options={courses.map((c) => ({ value: c.id, label: c.title }))}
        />
        <Select
          id="grades-evaluation"
          label="Evaluación"
          value={activeEvalId ?? ""}
          onChange={(e) => setEvalId(e.target.value)}
          options={(evaluations ?? []).map((e) => ({
            value: e.id,
            label: `${KIND_LABEL[e.kind] ?? e.kind} · ${e.title}`,
          }))}
        />
      </div>

      {evaluations && evaluations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Este curso no tiene evaluaciones todavía."
            hint="Crea un quiz o un diagnóstico desde el detalle del curso."
          />
        </div>
      ) : loading || !vm ? (
        <div className="mt-6 h-6 w-32 animate-pulse rounded bg-[var(--color-divider)]" />
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between">
            <Label>
              {vm.rows.length} {vm.rows.length === 1 ? "estudiante" : "estudiantes"} · {vm.evaluation.title}
            </Label>
            <Button
              variant="secondary"
              className="!px-3.5 !py-1.5 text-xs"
              onClick={() => void exportCsv()}
              disabled={exporting}
            >
              <Download size={13} /> {exporting ? "Generando…" : "Exportar CSV"}
            </Button>
          </div>
          {exportError && (
            <p className="mt-2 text-right text-xs text-[var(--color-coral)]">{exportError}</p>
          )}

          {vm.rows.some((r) => r.bestScore !== undefined) && (
            <Card bordered className="mt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label>Mejor nota por estudiante</Label>
                {vm.evaluation.passingScore !== undefined && (
                  <span className="font-mono text-xs tabular-nums text-[var(--color-muted)]">
                    {vm.rows.filter((r) => r.bestScore !== undefined && !r.passed).length} bajo el{" "}
                    {vm.evaluation.passingScore}% ·{" "}
                    {vm.rows.filter((r) => r.bestScore === undefined).length} sin intentos
                  </span>
                )}
              </div>
              <ScoreStrip
                className="mt-5"
                threshold={vm.evaluation.passingScore}
                points={vm.rows
                  .filter((r) => r.bestScore !== undefined)
                  .map((r) => ({ id: r.student.id, value: r.bestScore!, label: r.student.displayName }))}
              />
            </Card>
          )}

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
                                <Badge tone="coral">Bajo el {vm.evaluation.passingScore}%</Badge>
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
      </PageBody>
    </div>
  );
}
