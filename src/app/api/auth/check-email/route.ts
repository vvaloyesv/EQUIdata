/**
 * ¿Ya existe una cuenta con este correo? Necesario en servidor porque un
 * visitante sin sesión no puede consultar `profiles` (RLS exige estar
 * autenticado) — este endpoint usa la service role key para resolverlo sin
 * exponerla al cliente.
 *
 * Usado por `login/page.tsx` para separar de verdad "iniciar sesión" de
 * "registrarse": antes, `signInWithOtp` creaba la cuenta automáticamente sin
 * importar cuál pestaña se eligió.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: null }));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exists: !!data });
}
