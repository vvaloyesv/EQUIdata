/**
 * Tipos de documento de identidad aceptados (Colombia). Cada tipo define su
 * propia regla de formato — se usa igual en el onboarding y en Configuración
 * para que ambos validen exactamente lo mismo.
 */

export interface DocumentTypeDef {
  code: string;
  label: string;
  /** true: solo dígitos. false: alfanumérico. */
  numericOnly: boolean;
  maxLength: number;
}

export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  { code: "CC", label: "Cédula de ciudadanía", numericOnly: true, maxLength: 10 },
  { code: "TI", label: "Tarjeta de identidad", numericOnly: true, maxLength: 10 },
  { code: "RC", label: "Registro civil de nacimiento", numericOnly: true, maxLength: 10 },
  { code: "CE", label: "Cédula de extranjería", numericOnly: true, maxLength: 7 },
  { code: "PA", label: "Pasaporte", numericOnly: false, maxLength: 16 },
  { code: "PPT", label: "Permiso por Protección Temporal", numericOnly: true, maxLength: 8 },
  { code: "PEP", label: "Permiso Especial de Permanencia", numericOnly: true, maxLength: 15 },
  { code: "CD", label: "Carné diplomático", numericOnly: false, maxLength: 11 },
  { code: "DE", label: "Documento extranjero", numericOnly: false, maxLength: 20 },
  { code: "SC", label: "Salvoconducto de permanencia", numericOnly: true, maxLength: 20 },
  { code: "NIT", label: "NIT", numericOnly: true, maxLength: 9 },
];

/** Listas para el <Select> genérico (value = código, label = "CC — Cédula de ciudadanía"). */
export const DOCUMENT_TYPE_OPTIONS = DOCUMENT_TYPES.map((d) => ({
  value: d.code,
  label: `${d.code} — ${d.label}`,
}));

/** Cuentas creadas antes de este campo (o migradas) quedan con este centinela hasta que la persona lo completa de verdad. */
export function isPendingDocumentNumber(documentNumber: string): boolean {
  return documentNumber.startsWith("PENDIENTE-");
}

/** Mensaje de error si no cumple, o null si el número es válido para ese tipo. */
export function validateDocumentNumber(
  documentType: string,
  documentNumber: string,
): string | null {
  const def = DOCUMENT_TYPES.find((d) => d.code === documentType);
  if (!def) return "Selecciona un tipo de documento.";
  const trimmed = documentNumber.trim();
  if (!trimmed) return "Escribe tu número de documento.";
  if (trimmed.length > def.maxLength) {
    return `${def.label} admite máximo ${def.maxLength} caracteres.`;
  }
  if (def.numericOnly && !/^\d+$/.test(trimmed)) {
    return `${def.label} solo admite números.`;
  }
  return null;
}
