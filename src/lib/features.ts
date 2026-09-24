/**
 * Secciones que se muestran solo cuando tienen funcionamiento real (M10 · F6).
 *
 * Regla de producto (CLAUDE.md): durante el piloto no se muestra ninguna
 * sección de fachada — se ve como algo roto. El código se conserva; para
 * volver a mostrarla basta la variable de entorno.
 */
export const features = {
  /** Proyectos de comunidad: fachada con datos de ejemplo, sin modelo propio. */
  projects: process.env.NEXT_PUBLIC_SHOW_PROJECTS === "true",
  /** "Continuar con Google": requiere configurar el proveedor en Supabase. */
  googleAuth: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
  /**
   * Mensajes (estudiante y profesora) y sus avisos (campana, contador de no
   * leídos): ocultos desde el 24/09/2026 porque no funcionaban bien en el
   * piloto. El modelo y las pantallas se conservan.
   */
  messages: process.env.NEXT_PUBLIC_SHOW_MESSAGES === "true",
};
