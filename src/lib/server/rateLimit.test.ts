import { describe, expect, it } from "vitest";
import { rateLimited } from "./rateLimit";

/** Cliente falso: responde lo que devolvería `rate_limit_hit` y guarda la llamada. */
function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    rpc: (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return Promise.resolve(result);
    },
  };
  return { client: client as unknown as Parameters<typeof rateLimited>[2], calls };
}

describe("rateLimited", () => {
  it("deja pasar dentro del límite y cuenta por ruta y persona", async () => {
    const { client, calls } = fakeClient({ data: 0, error: null });
    expect(await rateLimited("attempts:answer", "u-student", client)).toBeNull();
    expect(calls).toEqual([
      {
        fn: "rate_limit_hit",
        args: { p_key: "attempts:answer:u-student", p_limit: 60, p_window_seconds: 60 },
      },
    ]);
  });

  it("responde 429 con Retry-After al pasar el tope", async () => {
    const { client } = fakeClient({ data: 17, error: null });
    const res = await rateLimited("attempts:start", "u-student", client);
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("17");
    expect((await res?.json()).error).toMatch(/demasiadas solicitudes/);
  });

  it("si el contador falla, la petición pasa", async () => {
    const { client } = fakeClient({ data: null, error: { message: "function not found" } });
    expect(await rateLimited("grades:export", "u-teacher", client)).toBeNull();
  });
});
