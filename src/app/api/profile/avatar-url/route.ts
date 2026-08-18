/**
 * Actualiza `profiles.avatar_url` del usuario autenticado.
 *
 * Mismo motivo que `src/app/api/profile/display-name/route.ts`: la política
 * RLS de `profiles` solo permite UPDATE al profesor — este campo se
 * actualiza en servidor, verificando la identidad con la sesión propia de
 * quien llama (nunca un id que mande el cliente) y escribiendo con la
 * service role key.
 *
 * El archivo en sí (ya comprimido) se sube directo desde el navegador a
 * Supabase Storage (bucket `avatars`, ver `supabase/migrations/0005_avatars_storage.sql`)
 * — esta ruta solo guarda la URL resultante en `profiles`.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { avatarUrl } = await request.json().catch(() => ({ avatarUrl: null }));
  if (!avatarUrl || typeof avatarUrl !== "string") {
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
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
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
