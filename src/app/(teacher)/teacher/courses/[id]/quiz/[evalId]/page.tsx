"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, FileCode2 } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildTeacherQuizView } from "@/lib/teacher/quiz";
import { genId } from "@/lib/teacher/course";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OutcomeForm } from "@/components/teacher/OutcomeForm";
import { ArchetypeForm } from "@/components/teacher/ArchetypeForm";
import { QuestionForm, type QuestionSubmitData } from "@/components/teacher/QuestionForm";

const KIND_LABEL: Record<string, string> = {
  diagnostic_initial: "Diagnóstico inicial",
  quiz: "Quiz",
  diagnostic_final: "Diagnóstico final",
  interest_onboarding: "Onboarding de intereses",
};

const TYPE_LABEL: Record<string, string> = {
  single: "Opción única",
  multiple: "Opción múltiple",
  open: "Respuesta abierta",
  scale: "Escala 1–10",
  ranking: "Ranking",
};

export default function TeacherQuizPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id: courseId, evalId } = use(params);
  const [reloadKey, setReloadKey] = useState(0);
  const [addingOutcome, setAddingOutcome] = useState(false);
  const [addingArchetype, setAddingArchetype] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const { data: vm, loading } = useAsync(
    () => buildTeacherQuizView(getRepository(), evalId),
    [evalId, reloadKey],
  );

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { course, evaluation, outcomes, archetypes, questions, optionsByQuestion } = vm;
  const isInterest = evaluation.kind === "interest_onboarding";

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const repo = getRepository();
    await repo.updateEvaluation({
      ...evaluation,
      title: String(form.get("title") ?? evaluation.title),
      maxAttempts: Number(form.get("maxAttempts") ?? evaluation.maxAttempts),
      passingScore:
        evaluation.kind === "diagnostic_initial"
          ? undefined
          : Number(form.get("passingScore") ?? evaluation.passingScore ?? 80),
      waitHours:
        evaluation.kind === "diagnostic_final"
          ? Number(form.get("waitHours") ?? evaluation.waitHours)
          : evaluation.waitHours,
    });
    setReloadKey((k) => k + 1);
  }

  async function addOutcome(data: { code: string; name: string; expectedLevel: number }) {
    const repo = getRepository();
    await repo.createOutcome({ id: genId("ra"), evaluationId: evalId, ...data });
    setAddingOutcome(false);
    setReloadKey((k) => k + 1);
  }

  async function addQuestion(data: QuestionSubmitData) {
    const repo = getRepository();
    const questionId = genId("q");
    await repo.createQuestion({
      id: questionId,
      evaluationId: evalId,
      order: questions.length + 1,
      type: data.type,
      text: data.text,
      points: data.points,
      outcomeId: data.outcomeId,
      correctValue: data.correctValue,
      tolerance: data.tolerance,
    });
    for (const o of data.options) {
      await repo.createOption({
        id: genId("o"),
        questionId,
        text: o.text,
        isCorrect: o.isCorrect,
        correctRank: o.correctRank,
        archetypeId: o.archetypeId,
      });
    }
    setAddingQuestion(false);
    setReloadKey((k) => k + 1);
  }

  async function addArchetype(data: { name: string; description: string }) {
    const repo = getRepository();
    await repo.createArchetype({
      id: genId("arch"),
      courseId: course.id,
      order: archetypes.length + 1,
      ...data,
    });
    setAddingArchetype(false);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link
        href={`/teacher/courses/${courseId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)]"
      >
        <ArrowLeft size={15} /> Volver a {course.title}
      </Link>

      <Badge tone="lavender" className="mb-2">
        {KIND_LABEL[evaluation.kind]}
      </Badge>
      <h1 className="font-display text-3xl text-[var(--color-navy)]">
        {evaluation.title}
      </h1>

      <Card bordered className="mt-6">
        <Label>Configuración</Label>
        <form onSubmit={saveSettings} className="mt-3 grid grid-cols-2 gap-3">
          <Input name="title" label="Título" defaultValue={evaluation.title} required />
          <Input
            name="maxAttempts"
            label="Intentos"
            type="number"
            min={1}
            defaultValue={evaluation.maxAttempts}
            required
          />
          {evaluation.kind !== "diagnostic_initial" && !isInterest && (
            <Input
              name="passingScore"
              label="Aprueba con (%)"
              type="number"
              min={0}
              max={100}
              defaultValue={evaluation.passingScore ?? 80}
            />
          )}
          {evaluation.kind === "diagnostic_final" && (
            <Input
              name="waitHours"
              label="Espera entre tandas (h)"
              type="number"
              min={0}
              defaultValue={evaluation.waitHours}
            />
          )}
          <div className="col-span-2">
            <Button type="submit" variant="secondary" className="!px-4 !py-2 text-sm">
              Guardar configuración
            </Button>
          </div>
        </form>
      </Card>

      {isInterest ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <Label>Arquetipos</Label>
            {!addingArchetype && (
              <button
                onClick={() => setAddingArchetype(true)}
                className="text-sm text-[var(--color-lavender-text)] hover:underline"
              >
                + Agregar arquetipo
              </button>
            )}
          </div>
          <div className="space-y-2">
            {archetypes.map((a) => (
              <div
                key={a.id}
                className="rounded-[var(--radius-token)] border border-[var(--color-divider)] px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-[var(--color-navy)]">{a.name}</span>
                <p className="mt-0.5 text-[var(--color-muted)]">{a.description}</p>
              </div>
            ))}
            {archetypes.length === 0 && !addingArchetype && (
              <p className="text-sm text-[var(--color-hint)]">Sin arquetipos todavía.</p>
            )}
            {addingArchetype && (
              <ArchetypeForm onSubmit={addArchetype} onCancel={() => setAddingArchetype(false)} />
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <Label>Resultados de aprendizaje</Label>
            {!addingOutcome && (
              <button
                onClick={() => setAddingOutcome(true)}
                className="text-sm text-[var(--color-lavender-text)] hover:underline"
              >
                + Agregar RA
              </button>
            )}
          </div>
          <div className="space-y-2">
            {outcomes.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-[var(--radius-token)] border border-[var(--color-divider)] px-4 py-2.5 text-sm"
              >
                <span className="text-[var(--color-navy)]">
                  <span className="font-medium">{o.code}</span> — {o.name}
                </span>
                <Label>Esperado {o.expectedLevel}%</Label>
              </div>
            ))}
            {outcomes.length === 0 && !addingOutcome && (
              <p className="text-sm text-[var(--color-hint)]">
                Sin resultados de aprendizaje todavía.
              </p>
            )}
            {addingOutcome && (
              <OutcomeForm onSubmit={addOutcome} onCancel={() => setAddingOutcome(false)} />
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <Label>Preguntas</Label>
          {!addingQuestion && (
            <button
              onClick={() => setAddingQuestion(true)}
              className="text-sm text-[var(--color-lavender-text)] hover:underline"
            >
              + Agregar pregunta
            </button>
          )}
        </div>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const outcome = outcomes.find((o) => o.id === q.outcomeId);
            return (
              <Card key={q.id} bordered className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Label>Pregunta {i + 1}</Label>
                      <Badge tone="neutral">{TYPE_LABEL[q.type]}</Badge>
                      {outcome && <Badge tone="lavender">{outcome.code}</Badge>}
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--color-navy)]">{q.text}</p>
                    {(q.type === "single" || q.type === "multiple") && (
                      <ul className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
                        {(optionsByQuestion[q.id] ?? []).map((o) => {
                          const archetype = archetypes.find((a) => a.id === o.archetypeId);
                          return (
                            <li key={o.id} className="flex items-center gap-1.5">
                              {isInterest ? (
                                <span className="w-[11px]" />
                              ) : o.isCorrect ? (
                                <ClipboardCheck size={11} className="text-[var(--color-lime-text)]" />
                              ) : (
                                <span className="w-[11px]" />
                              )}
                              {o.text}
                              {isInterest && archetype && (
                                <Badge tone="lavender" className="!py-0 !text-[10px]">
                                  {archetype.name}
                                </Badge>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  {!isInterest && (
                    <Label className="shrink-0">{q.points} pt{q.points !== 1 && "s"}</Label>
                  )}
                </div>
              </Card>
            );
          })}
          {questions.length === 0 && !addingQuestion && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-hint)]">
              <FileCode2 size={14} /> Sin preguntas todavía.
            </div>
          )}
          {addingQuestion && (
            <QuestionForm
              outcomes={outcomes}
              archetypes={isInterest ? archetypes : undefined}
              onSubmit={addQuestion}
              onCancel={() => setAddingQuestion(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
