/**
 * Listas fijas del onboarding.
 *
 * Cargo y área son definitivas. Área es editable por el profesor/admin desde
 * Configuración (agregar/quitar), pero arranca con la lista real de la
 * Fundación. Al conectar Supabase, estas listas podrían venir de una tabla
 * de catálogo. No hay campo "sede": la Fundación opera en una sola sede.
 */

/** Definitiva. */
export const CARGO_OPTIONS = [
  "Directoras/Directores",
  "Lideresas/Líderes",
  "Gestoras/Gestores",
  "Auxiliares",
  "Pasantes",
] as const;

/** Definitiva — áreas de la Fundación WWB Colombia. */
export const AREA_OPTIONS = [
  "Comunicaciones",
  "Financiero y administrativo",
  "Inversiones y tesorería",
  "Investigación",
  "Jurídico",
  "Planeación, estrategia y analítica",
  "Presidencia",
  "Programas",
] as const;
