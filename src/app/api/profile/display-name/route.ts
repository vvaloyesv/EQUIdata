/**
 * Actualiza `profiles.display_name` del usuario autenticado.
 *
 * La política RLS de `profiles` solo permite UPDATE al profesor
 * (`is_teacher()`) — a propósito, para que nadie pueda tocar su propio `role`
 * vía REST. Por eso este único campo se actualiza aquí, en servidor: se
 * verifica la identidad con la sesión propia de quien llama (cookies, nunca
 * un id que mande el cliente) y se escribe con la service role key, sin
 * exponerla y sin abrir la tabla completa a escritura del lado del cliente.
 *
 * Usado por `ProfileCompletionModal.tsx` para sincronizar el nombre real
 * (nombres + apellidos) una vez completado el perfil — antes de esto,
 * `display_name` se quedaba pegado al valor con el que se creó la cuenta
 * (el correo).
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { displayName } = await request.json().catch(() => ({ displayName: null }));
  if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }

  const sessionClient = await createRouteHandlerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await service
    .from("profiles")
    .update({ display_name: displayName.trim() })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
