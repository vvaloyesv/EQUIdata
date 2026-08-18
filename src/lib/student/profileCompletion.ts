/**
 * ¿Le falta a esta persona completar datos obligatorios? Sirve tanto para el
 * estudiante recién registrado (perfil recién creado, sin nada) como para
 * una cuenta vieja migrada con el valor centinela de documento (ver
 * `supabase/migrations/0004_student_document.sql`). En ambos casos, el
 * layout del estudiante muestra `ProfileCompletionModal` hasta que esto
 * deje de ser true.
 */

import type { StudentProfile } from "@/lib/domain/types";
import { isPendingDocumentNumber } from "@/lib/brand/documentTypes";

export function isProfileIncomplete(profile: StudentProfile | null): boolean {
  if (!profile || !profile.completed) return true;
  if (!profile.documentType || isPendingDocumentNumber(profile.documentNumber)) return true;
  return false;
}
