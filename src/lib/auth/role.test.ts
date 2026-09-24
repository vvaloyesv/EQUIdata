import { describe, expect, it } from "vitest";
import { claimsFromAccessToken, homeForRole, roleFromClaims } from "./role";

const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("rol de la sesión", () => {
  it("lee user_role del token", () => {
    const token = `h.${b64url({ sub: "u1", user_role: "teacher", nombre: "Válida ñ" })}.s`;
    expect(roleFromClaims(claimsFromAccessToken(token))).toBe("teacher");
  });

  it("sin hook activado no hay claim y devuelve null (se cae a profiles)", () => {
    expect(roleFromClaims(claimsFromAccessToken(`h.${b64url({ sub: "u1", role: "authenticated" })}.s`))).toBeNull();
  });

  it("ignora valores de rol desconocidos y tokens mal formados", () => {
    expect(roleFromClaims({ user_role: "admin" })).toBeNull();
    expect(claimsFromAccessToken("no-es-un-jwt")).toBeNull();
    expect(claimsFromAccessToken(undefined)).toBeNull();
  });

  it("destino por rol", () => {
    expect(homeForRole("teacher")).toBe("/teacher/dashboard");
    expect(homeForRole("student")).toBe("/dashboard");
    expect(homeForRole(null)).toBe("/dashboard");
  });
});
