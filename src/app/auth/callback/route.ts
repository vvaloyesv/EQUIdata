/**
 * Callback de OAuth (Google). Supabase redirige aquí con un `code` en la
 * query string tras el login en Google; lo canjeamos por una sesión real y
 * mandamos a la persona a su dashboard según su rol.
 */

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { claimsFromAccessToken, homeForRole, resolveRole } from "@/lib/auth/role";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const role = await resolveRole(
    supabase,
    data.user.id,
    claimsFromAccessToken(data.session?.access_token),
  );
  return NextResponse.redirect(`${origin}${homeForRole(role)}`);
}
