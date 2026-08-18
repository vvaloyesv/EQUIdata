import { useRouter } from "next/navigation";
import { getRepository } from "@/lib/data";
import { genId } from "@/lib/teacher/course";
import { toEmbedVideoUrl } from "@/lib/video";
import type { Module, ModuleType } from "@/lib/domain/types";
import type { TeacherCourseVM } from "@/lib/teacher/course";

export interface NewModuleData {
  type: ModuleType;
  title: string;
  description: string;
  videoUrl?: string;
  contentHtml?: string;
  durationMin: number;
}

/** Mutaciones del editor de curso del profesor — separadas de la UI para que la página quede legible. */
export function useTeacherCourseActions(
  courseId: string,
  vm: TeacherCourseVM | null,
  refresh: () => void,
) {
  const router = useRouter();

  async function addSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextOrder = (vm?.sessions.length ?? 0) + 1;
    await getRepository().createSession({
      id: genId("s"),
      courseId,
      order: nextOrder,
      title: String(form.get("title") ?? ""),
      unlockDate: form.get("unlockDate")
        ? new Date(String(form.get("unlockDate"))).toISOString()
        : undefined,
    });
    refresh();
  }

  async function addModule(
    sessionId: string,
    currentModules: Module[],
    data: NewModuleData,
  ) {
    await getRepository().createModule({
      id: genId("m"),
      sessionId,
      context: "course",
      order: currentModules.length + 1,
      ...data,
      videoUrl: data.videoUrl ? toEmbedVideoUrl(data.videoUrl) : data.videoUrl,
    });
    refresh();
  }

  async function enrollStudent(userId: string) {
    if (!userId) return;
    await getRepository().createEnrollment({
      userId,
      courseId,
      enrolledAt: new Date().toISOString(),
    });
    refresh();
  }

  async function togglePublished() {
    if (!vm) return;
    await getRepository().updateCourse({
      ...vm.course,
      published: !vm.course.published,
    });
    refresh();
  }

  async function toggleEnrollmentOpen() {
    if (!vm) return;
    await getRepository().updateCourse({
      ...vm.course,
      enrollmentOpen: !vm.course.enrollmentOpen,
    });
    refresh();
  }

  async function saveCertDesc(value: string) {
    if (!vm) return;
    await getRepository().updateCourse({
      ...vm.course,
      certificateDescription: value || undefined,
    });
    refresh();
  }

  async function saveCertDuration(value: string) {
    if (!vm) return;
    await getRepository().updateCourse({
      ...vm.course,
      certificateDurationHours: value ? Number(value) : undefined,
    });
    refresh();
  }

  async function createDiagnostic(kind: "diagnostic_initial" | "diagnostic_final") {
    const repo = getRepository();
    const id = genId("e");
    await repo.createEvaluation({
      id,
      courseId,
      kind,
      title: kind === "diagnostic_initial" ? "Diagnóstico inicial" : "Diagnóstico final",
      maxAttempts: kind === "diagnostic_initial" ? 1 : 2,
      waitHours: kind === "diagnostic_final" ? 8 : 0,
      passingScore: kind === "diagnostic_final" ? 80 : undefined,
      isActive: true,
    });
    router.push(`/teacher/courses/${courseId}/quiz/${id}`);
  }

  async function createInterestOnboarding() {
    const repo = getRepository();
    const id = genId("e");
    await repo.createEvaluation({
      id,
      courseId,
      kind: "interest_onboarding",
      title: "Onboarding de intereses",
      maxAttempts: 1,
      waitHours: 0,
      isActive: true,
    });
    router.push(`/teacher/courses/${courseId}/quiz/${id}`);
  }

  return {
    addSession,
    addModule,
    enrollStudent,
    togglePublished,
    toggleEnrollmentOpen,
    saveCertDesc,
    saveCertDuration,
    createDiagnostic,
    createInterestOnboarding,
  };
}
