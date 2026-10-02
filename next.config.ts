import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad (Seguridad, Fase 1 · SEC-07).
 *
 * - X-Frame-Options / frame-ancestors: nadie puede meter EQUIdata en un iframe
 *   ajeno (clickjacking). Los iframes que EQUIdata muestra (YouTube, módulos
 *   HTML) no se ven afectados: esta cabecera habla de quién nos enmarca a
 *   nosotros, no de a quién enmarcamos.
 * - Permissions-Policy: apaga cámara, micrófono, ubicación, pagos y USB, que
 *   la app no usa. NO apaga autoplay, pantalla completa, picture-in-picture ni
 *   sensores: el reproductor de YouTube y los módulos HTML los piden.
 * - CSP obligatoria (desde 01/10/2026; antes estuvo en Report-Only para
 *   medir). Los módulos HTML de autor se muestran con srcdoc y HEREDAN esta
 *   política: por eso se permiten los tres CDN de librerías más comunes
 *   (jsDelivr, cdnjs, unpkg) e imágenes por https. Si un módulo nuevo carga
 *   algo de otro dominio, no se verá hasta agregar ese dominio aquí
 *   (design spec §12). Un HTML de autor tampoco puede pedir datos a otras
 *   APIs (connect-src): si hace falta, se agrega su dominio.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = supabaseUrl.replace(/^https?:\/\//, "");
const isDev = process.env.NODE_ENV === "development";

/** CDN de librerías que pueden usar los módulos HTML de autor. */
const libraryCdns = "https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com";

const csp = [
  "default-src 'self'",
  // Next inyecta scripts en línea; en desarrollo además usa eval (recarga en caliente).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.youtube.com https://player.vimeo.com ${libraryCdns}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${libraryCdns}`,
  `font-src 'self' data: https://fonts.gstatic.com ${libraryCdns}`,
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseUrl} wss://${supabaseHost}`,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Carpeta de compilación configurable: las verificaciones automáticas usan
  // otra (NEXT_DIST_DIR=.next-verify) para no pisar la del servidor de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // El HTML embebido de módulos se renderiza en iframes aislados (sandbox),
  // no requiere configuración especial aquí. Todas las imágenes (logo, avatares
  // de mood) son locales — no hay <Image> remota que necesite remotePatterns.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
