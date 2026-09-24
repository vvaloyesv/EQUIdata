-- EQUIdata — M10: "ocultar mi nombre en Comunidad" frente a otras estudiantes
--
-- Bug: la preferencia vive en student_profiles.show_name_in_community, y la
-- RLS de student_profiles solo deja leer el propio perfil (o todos, a la
-- profesora). Para otra estudiante la preferencia llegaba vacía y el feed
-- mostraba el nombre real.
--
-- Arreglo: una función security definer que devuelve SOLO los ids de
-- quienes pidieron ocultar su nombre. No expone ningún otro dato del perfil
-- (documento, cargo, área siguen protegidos por la RLS de siempre).
--
-- Alcance: arregla lo que se ve en pantalla. El author_id de cada
-- publicación sigue siendo legible por la API para cualquier autenticado
-- (como en 0002), así que alguien con conocimientos técnicos podría cruzarlo
-- con profiles. Ocultarlo también a nivel de API es un cambio aparte.

create or replace function public.community_hidden_author_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id
  from public.student_profiles
  where show_name_in_community = false;
$$;

revoke execute on function public.community_hidden_author_ids() from public, anon;
grant execute on function public.community_hidden_author_ids() to authenticated;
