
create table if not exists public.api_rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated, public;
grant select, insert, update, delete on public.api_rate_limits to service_role;

-- Suma un golpe y devuelve 0 si está dentro del límite, o los segundos que
-- faltan para que abra la siguiente ventana (para Retry-After).
create or replace function public.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_hits integer;
begin
  insert into public.api_rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Limpieza perezosa: de vez en cuando se borran ventanas de más de un día.
  if random() < 0.01 then
    delete from public.api_rate_limits where window_start < now() - interval '1 day';
  end if;

  if v_hits <= p_limit then
    return 0;
  end if;
  return greatest(
    1,
    ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::integer
  );
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
