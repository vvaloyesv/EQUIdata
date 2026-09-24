-- EQUIdata — M10 · F3: índices, RLS eficiente y escrituras atómicas
--
-- Se corre DESPUÉS de 0006_auth_hook.sql. No cambia quién puede ver o
-- escribir qué: las políticas de abajo son las mismas de 0002_rls.sql,
-- reescritas para que Postgres las evalúe una vez por consulta y no fila por
-- fila. Nota: no existe 0003 en el repo; el 24/09/2026 se comparó el esquema
-- real contra 0001+0002+0004+0005 (26 tablas, mismas columnas) y no hay
-- diferencias.
--
-- Qué hace:
--   1. Índices en las columnas por las que filtra la app (FKs sin índice).
--   2. is_teacher() lee el rol del token (claim user_role, 0006) y solo
--      consulta profiles si el claim no viene.
--   3. RLS: auth.uid() e is_teacher() envueltos en (select …), para que se
--      calculen una vez por consulta (recomendación de Supabase), y las
--      políticas "for all" del profesor partidas en insert/update/delete,
--      para que no se sumen a la política de lectura en cada SELECT.
--   4. submit_attempt(): intento + respuestas + resultados por RA en una
--      sola transacción. grant_bonus_attempt(): incremento sin carrera.

-- ────────────────────────────────────────────────────────────────
-- 1. Índices
-- ────────────────────────────────────────────────────────────────

create index if not exists sessions_course_order_idx on public.sessions (course_id, order_index);
create index if not exists modules_session_order_idx on public.modules (session_id, order_index);
create index if not exists modules_context_idx on public.modules (context);
create index if not exists evaluations_course_idx on public.evaluations (course_id);
create index if not exists evaluations_session_idx on public.evaluations (session_id);
create index if not exists evaluations_tutorial_module_idx on public.evaluations (tutorial_module_id);
create index if not exists questions_evaluation_order_idx on public.questions (evaluation_id, order_index);
create index if not exists question_options_question_idx on public.question_options (question_id);
create index if not exists learning_outcomes_evaluation_idx on public.learning_outcomes (evaluation_id);
create index if not exists archetypes_course_idx on public.archetypes (course_id);
create index if not exists enrollments_course_idx on public.enrollments (course_id);
create index if not exists module_progress_module_idx on public.module_progress (module_id);
create index if not exists attempts_user_evaluation_idx on public.attempts (user_id, evaluation_id);
create index if not exists attempts_evaluation_idx on public.attempts (evaluation_id);
create index if not exists answers_attempt_idx on public.answers (attempt_id);
create index if not exists outcome_scores_outcome_idx on public.outcome_scores (outcome_id);
create index if not exists bonus_attempts_evaluation_idx on public.bonus_attempts (evaluation_id);
create index if not exists messages_to_read_idx on public.messages (to_user_id, read);
create index if not exists messages_from_idx on public.messages (from_user_id);
create index if not exists community_posts_created_idx on public.community_posts (created_at desc);
create index if not exists community_likes_user_idx on public.community_likes (user_id);
create index if not exists community_replies_post_idx on public.community_replies (post_id, created_at);
create index if not exists certificates_user_course_idx on public.certificates (user_id, course_id);
create index if not exists challenge_attempts_user_idx on public.challenge_attempts (user_id);

-- ────────────────────────────────────────────────────────────────
-- 2. is_teacher(): primero el claim del token, después la tabla
-- ────────────────────────────────────────────────────────────────

create or replace function public.is_teacher()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when (auth.jwt() ? 'user_role') then (auth.jwt() ->> 'user_role') = 'teacher'
    else exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher'
    )
  end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 3. RLS — mismas reglas que 0002, evaluadas una vez por consulta
-- ────────────────────────────────────────────────────────────────

-- profiles ----------------------------------------------------------
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using ((select auth.uid()) is not null);

drop policy if exists "profiles_update_teacher" on public.profiles;
create policy "profiles_update_teacher" on public.profiles
  for update using ((select public.is_teacher())) with check ((select public.is_teacher()));

-- student_profiles ---------------------------------------------------
drop policy if exists "student_profiles_own_or_teacher" on public.student_profiles;
create policy "student_profiles_own_or_teacher" on public.student_profiles
  for all
  using ((select auth.uid()) = user_id or (select public.is_teacher()))
  with check ((select auth.uid()) = user_id or (select public.is_teacher()));

-- Contenido y configuración: lectura para autenticados, escritura solo
-- profesor. Se generan las 4 políticas por tabla con un bloque, para no
-- repetir 11 veces lo mismo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'onboarding_field_defs', 'area_options', 'courses', 'sessions', 'modules',
    'archetypes', 'evaluations', 'learning_outcomes', 'questions',
    'question_options', 'challenges'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write_teacher', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_teacher', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_teacher', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_teacher', t);

    execute format(
      'create policy %I on public.%I for select using ((select auth.uid()) is not null)',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert with check ((select public.is_teacher()))',
      t || '_insert_teacher', t);
    execute format(
      'create policy %I on public.%I for update using ((select public.is_teacher())) with check ((select public.is_teacher()))',
      t || '_update_teacher', t);
    execute format(
      'create policy %I on public.%I for delete using ((select public.is_teacher()))',
      t || '_delete_teacher', t);
  end loop;
end;
$$;

-- Datos personales: dueño o profesor (una sola política "for all" por
-- tabla, sin solapamiento).
drop policy if exists "enrollments_own_or_teacher" on public.enrollments;
create policy "enrollments_own_or_teacher" on public.enrollments
  for all
  using ((select auth.uid()) = user_id or (select public.is_teacher()))
  with check ((select auth.uid()) = user_id or (select public.is_teacher()));

drop policy if exists "module_progress_own_or_teacher" on public.module_progress;
create policy "module_progress_own_or_teacher" on public.module_progress
  for all
  using ((select auth.uid()) = user_id or (select public.is_teacher()))
  with check ((select auth.uid()) = user_id or (select public.is_teacher()));

drop policy if exists "attempts_own_or_teacher" on public.attempts;
create policy "attempts_own_or_teacher" on public.attempts
  for all
  using ((select auth.uid()) = user_id or (select public.is_teacher()))
  with check ((select auth.uid()) = user_id or (select public.is_teacher()));

drop policy if exists "answers_own_or_teacher" on public.answers;
create policy "answers_own_or_teacher" on public.answers
  for all
  using (
    (select public.is_teacher())
    or exists (
      select 1 from public.attempts a
      where a.id = answers.attempt_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_teacher())
    or exists (
      select 1 from public.attempts a
      where a.id = answers.attempt_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "outcome_scores_own_or_teacher" on public.outcome_scores;
create policy "outcome_scores_own_or_teacher" on public.outcome_scores
  for all
  using (
    (select public.is_teacher())
    or exists (
      select 1 from public.attempts a
      where a.id = outcome_scores.attempt_id and a.user_id = (select auth.uid())
    )
  )
  with check (
    (select public.is_teacher())
    or exists (
      select 1 from public.attempts a
      where a.id = outcome_scores.attempt_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "bonus_attempts_select_own_or_teacher" on public.bonus_attempts;
create policy "bonus_attempts_select_own_or_teacher" on public.bonus_attempts
  for select using ((select auth.uid()) = user_id or (select public.is_teacher()));

drop policy if exists "bonus_attempts_write_teacher" on public.bonus_attempts;
drop policy if exists "bonus_attempts_insert_teacher" on public.bonus_attempts;
drop policy if exists "bonus_attempts_update_teacher" on public.bonus_attempts;
drop policy if exists "bonus_attempts_delete_teacher" on public.bonus_attempts;
create policy "bonus_attempts_insert_teacher" on public.bonus_attempts
  for insert with check ((select public.is_teacher()));
create policy "bonus_attempts_update_teacher" on public.bonus_attempts
  for update using ((select public.is_teacher())) with check ((select public.is_teacher()));
create policy "bonus_attempts_delete_teacher" on public.bonus_attempts
  for delete using ((select public.is_teacher()));

drop policy if exists "challenge_attempts_own_or_teacher" on public.challenge_attempts;
create policy "challenge_attempts_own_or_teacher" on public.challenge_attempts
  for all
  using ((select auth.uid()) = user_id or (select public.is_teacher()))
  with check ((select auth.uid()) = user_id or (select public.is_teacher()));

drop policy if exists "mood_entries_own_or_teacher" on public.mood_entries;
create policy "mood_entries_own_or_teacher" on public.mood_entries
  for all
  using ((select auth.uid()) = user_id or (select public.is_teacher()))
  with check ((select auth.uid()) = user_id or (select public.is_teacher()));

-- Mensajes -------------------------------------------------------------
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    (select auth.uid()) = from_user_id
    or (select auth.uid()) = to_user_id
    or (select public.is_teacher())
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check ((select auth.uid()) = from_user_id or (select public.is_teacher()));

drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read" on public.messages
  for update
  using ((select auth.uid()) = to_user_id or (select public.is_teacher()))
  with check ((select auth.uid()) = to_user_id or (select public.is_teacher()));

-- Comunidad ------------------------------------------------------------
drop policy if exists "community_posts_select" on public.community_posts;
create policy "community_posts_select" on public.community_posts
  for select using ((select auth.uid()) is not null);
drop policy if exists "community_posts_insert" on public.community_posts;
create policy "community_posts_insert" on public.community_posts
  for insert with check ((select auth.uid()) = author_id);

drop policy if exists "community_replies_select" on public.community_replies;
create policy "community_replies_select" on public.community_replies
  for select using ((select auth.uid()) is not null);
drop policy if exists "community_replies_insert" on public.community_replies;
create policy "community_replies_insert" on public.community_replies
  for insert with check ((select auth.uid()) = author_id);

drop policy if exists "community_likes_select" on public.community_likes;
create policy "community_likes_select" on public.community_likes
  for select using ((select auth.uid()) is not null);
drop policy if exists "community_likes_insert" on public.community_likes;
create policy "community_likes_insert" on public.community_likes
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "community_likes_delete" on public.community_likes;
create policy "community_likes_delete" on public.community_likes
  for delete using ((select auth.uid()) = user_id);

-- Certificados (lectura pública se mantiene tal cual en 0002) ----------
drop policy if exists "certificates_write_own_or_teacher" on public.certificates;
create policy "certificates_write_own_or_teacher" on public.certificates
  for insert with check ((select auth.uid()) = user_id or (select public.is_teacher()));

-- ────────────────────────────────────────────────────────────────
-- 4. Escrituras atómicas
-- ────────────────────────────────────────────────────────────────

-- Un intento enviado entra completo o no entra: antes eran tres inserts
-- separados desde el navegador, y un corte de red entre ellos dejaba un
-- intento sin respuestas. security invoker: aplican las mismas políticas
-- RLS que a un insert directo.
create or replace function public.submit_attempt(
  p_attempt jsonb,
  p_answers jsonb,
  p_outcome_scores jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.attempts
    select * from jsonb_populate_record(null::public.attempts, p_attempt);
  insert into public.answers
    select * from jsonb_populate_recordset(null::public.answers, coalesce(p_answers, '[]'::jsonb));
  insert into public.outcome_scores
    select * from jsonb_populate_recordset(null::public.outcome_scores, coalesce(p_outcome_scores, '[]'::jsonb));
end;
$$;

revoke execute on function public.submit_attempt(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.submit_attempt(jsonb, jsonb, jsonb) to authenticated;

-- Reabrir intento: antes era leer el conteo y escribir +1 (dos clics
-- seguidos podían contar uno solo). Ahora es un único upsert.
create or replace function public.grant_bonus_attempt(p_user_id uuid, p_evaluation_id text)
returns integer
language sql
security invoker
set search_path = public
as $$
  insert into public.bonus_attempts (user_id, evaluation_id, count)
  values (p_user_id, p_evaluation_id, 1)
  on conflict (user_id, evaluation_id)
  do update set count = public.bonus_attempts.count + 1
  returning count;
$$;

revoke execute on function public.grant_bonus_attempt(uuid, text) from public, anon;
grant execute on function public.grant_bonus_attempt(uuid, text) to authenticated;
