/**
 * Traduce los errores de Supabase Auth a mensajes para la persona: qué pasó
 * y qué hacer. Nunca muestra el texto crudo en inglés de la API.
 */

import type { AuthError } from "@supabase/supabase-js";

export function authErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return "No pudimos completar el ingreso. Intenta de nuevo.";

  const code = error.code ?? "";
  const message = error.message.toLowerCase();

  if (code === "otp_expired" || message.includes("expired or is invalid")) {
    return "El código es incorrecto o ya venció. Revísalo o pide uno nuevo.";
  }
  if (code === "over_email_send_rate_limit" || message.includes("email rate limit")) {
    return "Ya pediste varios códigos seguidos. Espera unos minutos antes de pedir otro.";
  }
  const wait = message.match(/after (\d+) seconds/);
  if (wait) {
    return `Por seguridad, espera ${wait[1]} segundos antes de pedir otro código.`;
  }
  if (code === "over_request_rate_limit" || error.status === 429) {
    return "Hubo demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.";
  }
  if (code === "otp_disabled" || code === "signup_disabled" || message.includes("signups not allowed")) {
    return "No encontramos una cuenta con este correo.";
  }
  if (code === "email_address_invalid" || message.includes("invalid format")) {
    return "Este correo no es válido. Revisa que esté bien escrito.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  return "No pudimos completar el ingreso. Intenta de nuevo en unos minutos.";
}
