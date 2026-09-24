import { describe, expect, it } from "vitest";
import type { AuthError } from "@supabase/supabase-js";
import { authErrorMessage } from "./authErrors";

const err = (message: string, code?: string, status?: number) =>
  ({ message, code, status, name: "AuthApiError" }) as unknown as AuthError;

describe("authErrorMessage", () => {
  it("código incorrecto o vencido", () => {
    expect(authErrorMessage(err("Token has expired or is invalid", "otp_expired", 403))).toMatch(
      /incorrecto o ya venció/,
    );
  });

  it("límite de intentos (el caso del bucle de verificación)", () => {
    expect(authErrorMessage(err("Request rate limit reached", "over_request_rate_limit", 429))).toMatch(
      /demasiados intentos/,
    );
  });

  it("límite de envío de correos", () => {
    expect(authErrorMessage(err("email rate limit exceeded", "over_email_send_rate_limit", 429))).toMatch(
      /varios códigos seguidos/,
    );
  });

  it("espera en segundos antes de reenviar", () => {
    expect(
      authErrorMessage(err("For security purposes, you can only request this after 42 seconds.", undefined, 429)),
    ).toBe("Por seguridad, espera 42 segundos antes de pedir otro código.");
  });

  it("nunca muestra el texto crudo de la API", () => {
    expect(authErrorMessage(err("Something unexpected happened"))).not.toMatch(/Something/);
    expect(authErrorMessage(null)).toMatch(/Intenta de nuevo/);
  });
});
