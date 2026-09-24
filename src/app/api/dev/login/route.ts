/**
 * Acceso rápido SOLO para desarrollo (M10 · F1b): entra como una cuenta
 * existente con una sesión real de Supabase, sin enviar correo. RLS, roles y
 * datos se comportan igual que en producción — no es un mock.
 *
 * Doble candado — fuera de desarrollo esta ruta no existe (404):
 *   1. `NODE_ENV === "development"` (en `next build`/`next start` y en el
 *      hosting siempre es "production").
 *   2. `DEV_QUICK_LOGIN === "true"`, variable que solo va en `.env.local`.
 *
 * GET  → cuentas disponibles para el panel de acceso rápido.
 * POST { email } → genera un código con la API admin (sin correo), lo
 *   canjea aquí mismo con el cliente de cookies y devuelve el destino.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@/lib/supabase/server";

function enabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_QUICK_LOGIN === "true";
}

function notFound() {
  return new NextResponse(null, { status: 404 });
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET() {
  if (!enabled()) return notFound();
  const { data, error } = await adminClient()
    .from("profiles")
    .select("email, role, display_name")
    .order("role", { ascending: false })
    .order("display_name")
    .limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    accounts: (data ?? []).map((p) => ({
      email: p.email as string,
      role: p.role as string,
      displayName: p.display_name as string,
    })),
  });
}

export async function POST(request: Request) {
  if (!enabled()) return notFound();

  const { email } = await request.json().catch(() => ({ email: null }));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Falta el correo" }, { status: 400 });
  }

  // Solo cuentas que ya existen: el acceso rápido nunca crea usuarios.
  const admin = adminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.trim())
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "No existe una cuenta con ese correo" }, { status: 404 });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim(),
  });
  if (linkError || !link.properties?.email_otp) {
    return NextResponse.json(
      { error: linkError?.message ?? "No se pudo generar el acceso" },
      { status: 400 },
    );
  }

  const supabase = await createRouteHandlerClient();
  const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: link.properties.email_otp,
    type: "email",
  });
  if (verifyError || !session.user) {
    return NextResponse.json(
      { error: verifyError?.message ?? "No se pudo iniciar la sesión" },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({
    destination: profile?.role === "teacher" ? "/teacher/dashboard" : "/dashboard",
  });
}
