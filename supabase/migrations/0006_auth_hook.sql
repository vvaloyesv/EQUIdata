-- EQUIdata — M10 · F2: rol dentro del token de sesión
--
-- Custom Access Token Hook: cada vez que Supabase emite o refresca un token,
-- agrega el claim `user_role` ('student' | 'teacher') leído de
-- `profiles.role`. Así el middleware (que corre en cada navegación) y las
-- políticas RLS saben el rol sin consultar la tabla.
--
-- Después de correr este archivo hay que ACTIVAR el hook en el dashboard:
--   Authentication → Hooks → Custom Access Token → función
--   `public.custom_access_token_hook`.
-- Mientras no esté activo, la app sigue funcionando: si el claim no viene,
-- `src/lib/auth/role.ts` y `is_teacher()` consultan `profiles` como antes.
--
-- Un cambio de rol se refleja en el token al siguiente refresco (≤ 1 hora).

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_role text;
begin
  select role into v_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  if v_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Solo el servicio de Auth puede ejecutar el hook; nadie desde la API.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- El hook corre como supabase_auth_admin, que no tiene auth.uid(): necesita
-- su propia política de lectura sobre profiles.
grant select on table public.profiles to supabase_auth_admin;

drop policy if exists "profiles_select_auth_admin" on public.profiles;
create policy "profiles_select_auth_admin" on public.profiles
  as permissive for select
  to supabase_auth_admin
  using (true);
