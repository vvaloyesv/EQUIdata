import Link from "next/link";
import { GraduationCap, FileCheck2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { TeacherCourseVM } from "@/lib/teacher/course";

/** Accesos para crear/editar los diagnósticos y el onboarding de intereses del curso. */
export function DiagnosticsRow({
  vm,
  courseId,
  onCreateDiagnostic,
  onCreateInterestOnboarding,
}: {
  vm: TeacherCourseVM;
  courseId: string;
  onCreateDiagnostic: (kind: "diagnostic_initial" | "diagnostic_final") => Promise<void>;
  onCreateInterestOnboarding: () => Promise<void>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {vm.diagnosticInitial ? (
        <Link href={`/teacher/courses/${courseId}/quiz/${vm.diagnosticInitial.id}`}>
          <Badge tone="lavender">
            <GraduationCap size={12} /> Diagnóstico inicial · editar
          </Badge>
        </Link>
      ) : (
        <Button
          variant="secondary"
          className="!px-3.5 !py-1.5 text-xs"
          onClick={() => onCreateDiagnostic("diagnostic_initial")}
        >
          <GraduationCap size={13} /> Crear diagnóstico inicial
        </Button>
      )}
      {vm.diagnosticFinal ? (
        <Link href={`/teacher/courses/${courseId}/quiz/${vm.diagnosticFinal.id}`}>
          <Badge tone="lavender">
            <FileCheck2 size={12} /> Diagnóstico final · editar
          </Badge>
        </Link>
      ) : (
        <Button
          variant="secondary"
          className="!px-3.5 !py-1.5 text-xs"
          onClick={() => onCreateDiagnostic("diagnostic_final")}
        >
          <FileCheck2 size={13} /> Crear diagnóstico final
        </Button>
      )}
      {vm.interestOnboarding ? (
        <Link href={`/teacher/courses/${courseId}/quiz/${vm.interestOnboarding.id}`}>
          <Badge tone="lavender">
            <Sparkles size={12} /> Onboarding de intereses · editar
          </Badge>
        </Link>
      ) : (
        <Button
          variant="secondary"
          className="!px-3.5 !py-1.5 text-xs"
          onClick={onCreateInterestOnboarding}
        >
          <Sparkles size={13} /> Crear onboarding de intereses
        </Button>
      )}
    </div>
  );
}
