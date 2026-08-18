"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Video, FileCode2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ModuleForm } from "./ModuleForm";
import type { TeacherSessionVM } from "@/lib/teacher/course";
import type { Module, ModuleType } from "@/lib/domain/types";

export function SessionEditor({
  vm,
  courseId,
  onAddModule,
}: {
  vm: TeacherSessionVM;
  courseId: string;
  onAddModule: (data: {
    type: ModuleType;
    title: string;
    description: string;
    videoUrl?: string;
    contentHtml?: string;
    durationMin: number;
  }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingModule, setAddingModule] = useState(false);

  return (
    <Card bordered className="!p-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <Label>Sesión {String(vm.session.order).padStart(2, "0")}</Label>
          <p className="mt-0.5 font-medium text-[var(--color-navy)]">
            {vm.session.title}
          </p>
          <Label className="mt-0.5">
            {vm.modules.length} módulo{vm.modules.length !== 1 && "s"}
            {vm.session.unlockDate &&
              ` · libera ${new Date(vm.session.unlockDate).toLocaleDateString("es-CO")}`}
          </Label>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-[var(--color-hint)] transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-[var(--color-divider)] p-5">
          {vm.modules.map((m: Module) => {
            const Icon = m.type === "video" ? Video : FileCode2;
            return (
              <div
                key={m.id}
                className="flex items-center gap-2.5 rounded-[var(--radius-token)] border border-[var(--color-divider)] px-3.5 py-2.5 text-sm"
              >
                <Icon size={14} className="shrink-0 text-[var(--color-lavender-text)]" />
                <span className="min-w-0 flex-1 truncate text-[var(--color-navy)]">
                  {m.title}
                </span>
                <Label>{m.durationMin ?? 10} min</Label>
              </div>
            );
          })}

          {vm.quiz ? (
            <Link
              href={`/teacher/courses/${courseId}/quiz/${vm.quiz.id}`}
              className="flex items-center gap-2.5 rounded-[var(--radius-token)] border border-[var(--color-coral)]/30 bg-[var(--color-coral-tint)] px-3.5 py-2.5 text-sm text-[var(--color-navy)] hover:border-[var(--color-coral)]"
            >
              <ClipboardCheck size={14} className="shrink-0 text-[var(--color-coral)]" />
              <span className="min-w-0 flex-1 truncate">{vm.quiz.title}</span>
              <Label>Editar quiz →</Label>
            </Link>
          ) : (
            <Link
              href={`/teacher/courses/${courseId}/quiz/new?sessionId=${vm.session.id}`}
              className="flex items-center gap-2.5 rounded-[var(--radius-token)] border border-dashed border-[var(--color-divider)] px-3.5 py-2.5 text-sm text-[var(--color-lavender-text)] hover:border-[var(--color-lavender)]"
            >
              <ClipboardCheck size={14} className="shrink-0" />
              + Crear quiz de esta sesión
            </Link>
          )}

          {addingModule ? (
            <ModuleForm
              onSubmit={(data) => {
                onAddModule(data);
                setAddingModule(false);
              }}
              onCancel={() => setAddingModule(false)}
            />
          ) : (
            <Button
              variant="secondary"
              className="!px-4 !py-2 text-sm"
              onClick={() => setAddingModule(true)}
            >
              + Agregar módulo
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
