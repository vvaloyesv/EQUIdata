"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, FileCode2 } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildTeacherTutorialQuizView } from "@/lib/teacher/tutorials";
import { genId } from "@/lib/teacher/course";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuestionForm, type QuestionSubmitData } from "@/components/teacher/QuestionForm";

const TYPE_LABEL: Record<string, string> = {
  single: "Opción única",
  multiple: "Opción múltiple",
  open: "Respuesta abierta",
  scale: "Escala 1–10",
  ranking: "Ranking",
};

export default function TeacherTutorialQuizPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { evalId } = use(params);
  const [reloadKey, setReloadKey] = useState(0);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const { data: vm, loading } = useAsync(
    () => buildTeacherTutorialQuizView(getRepository(), evalId),
    [evalId, reloadKey],
  );

  if (loading || !vm) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { tutorial, evaluation, questions, optionsByQuestion } = vm;

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const repo = getRepository();
    await repo.updateEvaluation({
      ...evaluation,
      title: String(form.get("title") ?? evaluation.title),
      maxAttempts: Number(form.get("maxAttempts") ?? evaluation.maxAttempts),
      passingScore: Number(form.get("passingScore") ?? evaluation.passingScore ?? 80),
    });
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
      });
    }
    setAddingQuestion(false);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link
        href="/teacher/tutorials"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)]"
      >
        <ArrowLeft size={15} /> Volver a {tutorial.title}
      </Link>

      <Badge tone="lavender" className="mb-2">
        Quiz de tutorial
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
          <Input
            name="passingScore"
            label="Aprueba con (%)"
            type="number"
            min={0}
            max={100}
            defaultValue={evaluation.passingScore ?? 80}
          />
          <div className="col-span-2">
            <Button type="submit" variant="secondary" className="!px-4 !py-2 text-sm">
              Guardar configuración
            </Button>
          </div>
        </form>
      </Card>

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
          {questions.map((q, i) => (
            <Card key={q.id} bordered className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Label>Pregunta {i + 1}</Label>
                    <Badge tone="neutral">{TYPE_LABEL[q.type]}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--color-navy)]">{q.text}</p>
                  {(q.type === "single" || q.type === "multiple") && (
                    <ul className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
                      {(optionsByQuestion[q.id] ?? []).map((o) => (
                        <li key={o.id} className="flex items-center gap-1.5">
                          {o.isCorrect ? (
                            <ClipboardCheck size={11} className="text-[var(--color-lime-text)]" />
                          ) : (
                            <span className="w-[11px]" />
                          )}
                          {o.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Label className="shrink-0">{q.points} pt{q.points !== 1 && "s"}</Label>
              </div>
            </Card>
          ))}
          {questions.length === 0 && !addingQuestion && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-hint)]">
              <FileCode2 size={14} /> Sin preguntas todavía.
            </div>
          )}
          {addingQuestion && (
            <QuestionForm
              outcomes={[]}
              noOutcomes
              onSubmit={addQuestion}
              onCancel={() => setAddingQuestion(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
