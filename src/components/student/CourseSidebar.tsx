"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Check, Circle, Lock, Video, FileCode2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Label";
import { ProgressBar } from "@/components/ui/Progress";
import type { CourseVM } from "@/lib/student/course";

/**
 * Barra lateral colapsable de sesiones y módulos (patrón LAB10): progreso
 * general arriba, sesiones expandibles con sus módulos debajo. Colapsa a un
 * riel angosto para dejarle casi toda la pantalla al video/HTML.
 */
export function CourseSidebar({
  vm,
  courseId,
  activeSessionId,
  activeModuleId,
  onSelectModule,
  collapsed,
  onToggleCollapsed,
}: {
  vm: CourseVM;
  courseId: string;
  activeSessionId?: string;
  activeModuleId?: string;
  onSelectModule: (sessionId: string, moduleId: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeSessionId) {
      setExpanded((prev) => new Set(prev).add(activeSessionId));
    }
  }, [activeSessionId]);

  const totalModules = vm.sessions.reduce((a, s) => a + s.modules.length, 0);
  const doneModules = vm.sessions.reduce(
    (a, s) => a + s.modules.filter((m) => s.completedModuleIds.has(m.id)).length,
    0,
  );
  const percent = totalModules ? Math.round((doneModules / totalModules) * 100) : 0;

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapsed}
        className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white text-[var(--color-muted)] hover:text-[var(--color-navy)]"
        title="Mostrar sesiones"
      >
        <ChevronRight size={16} />
      </button>
    );
  }

  return (
    <div className="w-[280px] shrink-0 rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-white">
      <div className="flex items-center justify-between p-4 pb-3">
        <div>
          <div className="font-display text-2xl text-[var(--color-navy)]">{percent}%</div>
          <Label>
            {doneModules}/{totalModules} módulos
          </Label>
        </div>
        <button
          onClick={onToggleCollapsed}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-navy)]"
          title="Colapsar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <div className="px-4 pb-3">
        <ProgressBar value={percent} />
      </div>

      <div className="max-h-[70vh] overflow-y-auto border-t border-[var(--color-divider)]">
        {vm.sessions.map((s) => {
          const isExpanded = expanded.has(s.session.id);
          const locked = s.status === "locked";
          const completed = s.status === "completed";

          return (
            <div key={s.session.id} className="border-b border-[var(--color-divider)] last:border-b-0">
              <button
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.session.id)) next.delete(s.session.id);
                    else next.add(s.session.id);
                    return next;
                  })
                }
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left",
                  locked ? "opacity-60" : "hover:bg-[var(--color-canvas)]",
                )}
              >
                <div className="min-w-0">
                  <Label>Sesión {String(s.session.order).padStart(2, "0")}</Label>
                  <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-navy)]">
                    {s.session.title}
                  </p>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-2">
                  {completed && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-lime)]">
                      <Check size={12} className="text-[var(--color-navy)]" />
                    </span>
                  )}
                  {locked && <Lock size={14} className="text-[var(--color-hint)]" />}
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-[var(--color-hint)] transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-0.5 px-2 pb-3">
                  {locked ? (
                    <p className="px-2.5 pb-1 text-xs text-[var(--color-hint)]">
                      {s.unlock.reasonLabel}
                    </p>
                  ) : (
                    <>
                      {s.modules.map((m) => {
                        const done = s.completedModuleIds.has(m.id);
                        const active = m.id === activeModuleId;
                        const Icon = m.type === "video" ? Video : FileCode2;
                        return (
                          <button
                            key={m.id}
                            onClick={() => onSelectModule(s.session.id, m.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-[var(--radius-token)] px-2.5 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-[var(--color-lime-tint)] text-[var(--color-navy)]"
                                : "hover:bg-[var(--color-canvas)]",
                            )}
                          >
                            {done ? (
                              <Check size={15} className="shrink-0 text-[var(--color-lime-text)]" />
                            ) : (
                              <Circle size={15} className="shrink-0 text-[var(--color-hint)]" />
                            )}
                            <Icon size={13} className="shrink-0 text-[var(--color-lavender-text)]" />
                            <span className="min-w-0 flex-1 truncate">{m.title}</span>
                          </button>
                        );
                      })}

                      {s.quizEvaluation && (() => {
                        const allModulesDone =
                          s.modules.length > 0 &&
                          s.modules.every((m) => s.completedModuleIds.has(m.id));
                        if (!allModulesDone) {
                          return (
                            <div className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-[var(--color-hint)]">
                              <ClipboardCheck size={14} className="shrink-0" />
                              <span className="min-w-0 flex-1 truncate">
                                {s.quizEvaluation.title}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <Link
                            href={`/courses/${courseId}/eval/${s.quizEvaluation.id}`}
                            className="flex items-center gap-2.5 rounded-[var(--radius-token)] px-2.5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-canvas)]"
                          >
                            <ClipboardCheck size={14} className="shrink-0 text-[var(--color-coral)]" />
                            <span className="min-w-0 flex-1 truncate">
                              {s.quizEvaluation.title}
                            </span>
                            {s.quizGate?.passed && (
                              <Check size={14} className="shrink-0 text-[var(--color-lime-text)]" />
                            )}
                          </Link>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
