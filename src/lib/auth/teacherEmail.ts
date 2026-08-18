/**
 * El profesor/admin es una cuenta específica (spec §2): el correo determina
 * el rol al iniciar sesión, no un conmutador manual. Cualquier otro correo
 * entra como estudiante (a la única cuenta de demo disponible).
 */
export const TEACHER_EMAIL = "vvaloyes@fundacionwwbcol.org";

export function isTeacherEmail(email: string): boolean {
  return email.trim().toLowerCase() === TEACHER_EMAIL.toLowerCase();
}
