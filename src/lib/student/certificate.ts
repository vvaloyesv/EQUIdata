/**
 * Emisión de certificados (spec §5.6).
 *
 * Centraliza dónde nace un certificado: la elegibilidad la decide
 * `buildCourseView` (no se duplica la regla), y aquí se persiste un snapshot
 * con código de verificación. La emisión es idempotente (una sola vez por
 * usuario+curso) — el repositorio garantiza que no se dupliquen códigos.
 */

import type { Repository } from "@/lib/data/repository";
import type { Certificate, StudentProfile, User } from "@/lib/domain/types";
import { buildCourseView, courseViewFrom, type CourseVM } from "./course";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1 (ambiguos)
/** Largo del sufijo: 33^10 ≈ 1.8e15 combinaciones — impráctico de enumerar por fuerza bruta. */
const CODE_LENGTH = 10;

/** Código de verificación público: EQUI-{año}-{10 alfanuméricos criptográficamente aleatorios}. */
export function generateCertificateCode(issuedAtIso: string): string {
  const year = new Date(issuedAtIso).getUTCFullYear();
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let suffix = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `EQUI-${year}-${suffix}`;
}

/**
 * Devuelve el certificado del usuario para ese curso; si aún no existe y la
 * persona ya es elegible, lo emite (snapshot + código). Devuelve null si no es
 * elegible todavía.
 */
export async function getOrIssueCertificate(
  repo: Repository,
  userId: string,
  courseId: string,
  nowIso: string,
): Promise<Certificate | null> {
  const existing = await repo.getCertificate(userId, courseId);
  if (existing) return existing;

  const vm = await buildCourseView(repo, userId, courseId, nowIso);
  if (!vm.certificateEligible) return null;

  const [profile, user] = await Promise.all([
    repo.getStudentProfile(userId),
    repo.getUserById(userId),
  ]);
  return repo.issueCertificate(certificateSnapshot(vm, userId, profile, user, nowIso));
}

/** Snapshot del certificado a partir del curso ya armado (no consulta nada). */
function certificateSnapshot(
  vm: CourseVM,
  userId: string,
  profile: StudentProfile | null,
  user: User | null,
  nowIso: string,
): Certificate {
  const studentName = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : (user?.displayName ?? "");

  // El profesor escribe la duración del certificado directamente (en horas) al
  // crear/editar el curso — es una estimación del tiempo real del curso, no
  // solo el largo de sus videos/HTML. Si no la escribió, se calcula sumando
  // la duración de los módulos, como respaldo.
  const durationMin =
    vm.course.certificateDurationHours !== undefined
      ? Math.round(vm.course.certificateDurationHours * 60)
      : vm.sessions.reduce(
          (sum, s) => sum + s.modules.reduce((a, m) => a + (m.durationMin ?? 0), 0),
          0,
        );

  return {
    code: generateCertificateCode(nowIso),
    userId,
    courseId: vm.course.id,
    studentName,
    courseTitle: vm.course.title,
    courseDescription: vm.course.certificateDescription || vm.course.description,
    teacherName: vm.course.teacherName,
    durationMin,
    issuedAt: nowIso,
  };
}

/**
 * Emite (si hace falta) los certificados de todos los cursos elegibles del
 * usuario y devuelve la lista completa. Así la pestaña "Certificaciones" está
 * al día aunque la persona nunca haya abierto la página de un certificado.
 *
 * M10 · F4: la elegibilidad de todos los cursos pendientes se calcula con una
 * sola tanda de lecturas (antes, la vista completa de cada curso, en serie).
 */
export async function syncAndListCertificates(
  repo: Repository,
  userId: string,
  nowIso: string,
): Promise<Certificate[]> {
  const [enrollments, certificates] = await Promise.all([
    repo.listEnrollments(userId),
    repo.listCertificates(userId),
  ]);
  const issuedCourseIds = new Set(certificates.map((c) => c.courseId));
  const pendingCourseIds = enrollments
    .map((e) => e.courseId)
    .filter((id) => !issuedCourseIds.has(id));
  if (pendingCourseIds.length === 0) return certificates;

  const [structures, progress, attempts, bonusByEvaluation, profile, user] = await Promise.all([
    repo.getCourseStructures(pendingCourseIds),
    repo.listModuleProgress(userId),
    repo.listAttemptsByUser(userId),
    repo.listBonusAttemptsByUser(userId),
    repo.getStudentProfile(userId),
    repo.getUserById(userId),
  ]);

  let issuedAny = false;
  for (const structure of structures) {
    const vm = courseViewFrom(structure, progress, attempts, bonusByEvaluation, nowIso);
    if (!vm.certificateEligible) continue;
    await repo.issueCertificate(certificateSnapshot(vm, userId, profile, user, nowIso));
    issuedAny = true;
  }
  return issuedAny ? repo.listCertificates(userId) : certificates;
}
