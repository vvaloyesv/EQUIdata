/**
 * Elegibilidad del certificado (spec §5.6).
 *
 * Es lógica real desde ahora (la emisión del PDF se aplaza). Una persona es
 * elegible cuando:
 *   1) aprobó el diagnóstico final (mejor intento ≥ passingScore), y
 *   2) completó el curso (todos los módulos de todas las sesiones).
 */

export interface CertificateInput {
  finalBestScore?: number;
  finalPassingScore: number;
  totalModules: number;
  completedModules: number;
}

export interface CertificateEligibility {
  eligible: boolean;
  reasonLabel?: string;
}

export function isCertificateEligible(
  input: CertificateInput,
): CertificateEligibility {
  const { finalBestScore, finalPassingScore, totalModules, completedModules } =
    input;

  const finalPassed =
    finalBestScore !== undefined && finalBestScore >= finalPassingScore;
  const courseComplete =
    totalModules > 0 && completedModules >= totalModules;

  if (finalPassed && courseComplete) return { eligible: true };

  if (!courseComplete) {
    return {
      eligible: false,
      reasonLabel: "Completa todos los módulos del curso",
    };
  }
  return {
    eligible: false,
    reasonLabel: "Aprueba el diagnóstico final para obtener tu certificado",
  };
}
