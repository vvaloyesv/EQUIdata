
drop policy if exists "questions_select" on public.questions;
create policy "questions_select" on public.questions
  for select using ((select public.is_teacher()));

drop policy if exists "question_options_select" on public.question_options;
create policy "question_options_select" on public.question_options
  for select using ((select public.is_teacher()));

create or replace view public.questions_public as
  select id, evaluation_id, order_index, type, text, image_url, points, outcome_id
  from public.questions;

create or replace view public.question_options_public as
  select o.id, o.question_id, q.evaluation_id, o.text, o.image_url, o.archetype_id
  from public.question_options o
  join public.questions q on q.id = o.question_id;

revoke all on public.questions_public from anon, public;
revoke all on public.question_options_public from anon, public;
grant select on public.questions_public to authenticated, service_role;
grant select on public.question_options_public to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────
-- SEC-01 · Intentos, respuestas y RA: lectura propia, escritura del servidor
-- ────────────────────────────────────────────────────────────────

drop policy if exists "attempts_own_or_teacher" on public.attempts;
drop policy if exists "attempts_select_own_or_teacher" on public.attempts;
drop policy if exists "attempts_insert_teacher" on public.attempts;
drop policy if exists "attempts_update_teacher" on public.attempts;
drop policy if exists "attempts_delete_teacher" on public.attempts;
create policy "attempts_select_own_or_teacher" on public.attempts
  for select using ((select auth.uid()) = user_id or (select public.is_teacher()));
create policy "attempts_insert_teacher" on public.attempts
  for insert with check ((select public.is_teacher()));
create policy "attempts_update_teacher" on public.attempts
  for update using ((select public.is_teacher())) with check ((select public.is_teacher()));
create policy "attempts_delete_teacher" on public.attempts
  for delete using ((select public.is_teacher()));

drop policy if exists "answers_own_or_teacher" on public.answers;
drop policy if exists "answers_select_own_or_teacher" on public.answers;
drop policy if exists "answers_insert_teacher" on public.answers;
drop policy if exists "answers_update_teacher" on public.answers;
drop policy if exists "answers_delete_teacher" on public.answers;
create policy "answers_select_own_or_teacher" on public.answers
  for select using (
    (select public.is_teacher())
    or exists (
      select 1 from public.attempts a
      where a.id = answers.attempt_id and a.user_id = (select auth.uid())
    )
  );
create policy "answers_insert_teacher" on public.answers
  for insert with check ((select public.is_teacher()));
create policy "answers_update_teacher" on public.answers
  for update using ((select public.is_teacher())) with check ((select public.is_teacher()));
create policy "answers_delete_teacher" on public.answers
  for delete using ((select public.is_teacher()));

drop policy if exists "outcome_scores_own_or_teacher" on public.outcome_scores;
drop policy if exists "outcome_scores_select_own_or_teacher" on public.outcome_scores;
drop policy if exists "outcome_scores_insert_teacher" on public.outcome_scores;
drop policy if exists "outcome_scores_update_teacher" on public.outcome_scores;
drop policy if exists "outcome_scores_delete_teacher" on public.outcome_scores;
create policy "outcome_scores_select_own_or_teacher" on public.outcome_scores
  for select using (
    (select public.is_teacher())
    or exists (
      select 1 from public.attempts a
      where a.id = outcome_scores.attempt_id and a.user_id = (select auth.uid())
    )
  );
create policy "outcome_scores_insert_teacher" on public.outcome_scores
  for insert with check ((select public.is_teacher()));
create policy "outcome_scores_update_teacher" on public.outcome_scores
  for update using ((select public.is_teacher())) with check ((select public.is_teacher()));
create policy "outcome_scores_delete_teacher" on public.outcome_scores
  for delete using ((select public.is_teacher()));

-- submit_attempt (0007) ya no se llama desde el navegador: solo el servidor.
revoke execute on function public.submit_attempt(jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.submit_attempt(jsonb, jsonb, jsonb) to service_role;

-- ────────────────────────────────────────────────────────────────
-- SEC-02 · Certificados: emite el servidor; verificar uno, no listar todos
-- ────────────────────────────────────────────────────────────────

drop policy if exists "certificates_write_own_or_teacher" on public.certificates;
drop policy if exists "certificates_insert_teacher" on public.certificates;
create policy "certificates_insert_teacher" on public.certificates
  for insert with check ((select public.is_teacher()));

drop policy if exists "certificates_select_public" on public.certificates;
drop policy if exists "certificates_select_own_or_teacher" on public.certificates;
create policy "certificates_select_own_or_teacher" on public.certificates
  for select using ((select auth.uid()) = user_id or (select public.is_teacher()));

-- /verify/[code]: cualquiera (incluso sin sesión) verifica UN certificado si
-- conoce su código. El código tiene 10 caracteres aleatorios (33^10).
create or replace function public.verify_certificate(p_code text)
returns setof public.certificates
language sql
stable
security definer
set search_path = public
as $$
  select * from public.certificates where code = p_code limit 1;
$$;

revoke execute on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- SEC-03 · profiles: fila propia o profesora; autores sin correo
-- ────────────────────────────────────────────────────────────────

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_own_or_teacher" on public.profiles;
create policy "profiles_select_own_or_teacher" on public.profiles
  for select using ((select auth.uid()) = id or (select public.is_teacher()));
-- (profiles_select_auth_admin, de 0006, se mantiene: la usa el hook del token.)

create or replace view public.public_profiles as
  select id, display_name, avatar_url, role
  from public.profiles;

revoke all on public.public_profiles from anon, public;
grant select on public.public_profiles to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────
-- Extra · Inscripciones: solo cursos publicados y abiertos
-- ────────────────────────────────────────────────────────────────

drop policy if exists "enrollments_own_or_teacher" on public.enrollments;
drop policy if exists "enrollments_select_own_or_teacher" on public.enrollments;
drop policy if exists "enrollments_insert_own_open_or_teacher" on public.enrollments;
drop policy if exists "enrollments_update_teacher" on public.enrollments;
drop policy if exists "enrollments_delete_teacher" on public.enrollments;
create policy "enrollments_select_own_or_teacher" on public.enrollments
  for select using ((select auth.uid()) = user_id or (select public.is_teacher()));
create policy "enrollments_insert_own_open_or_teacher" on public.enrollments
  for insert with check (
    (select public.is_teacher())
    or (
      (select auth.uid()) = user_id
      and exists (
        select 1 from public.courses c
        where c.id = course_id and c.published and c.enrollment_open
      )
    )
  );
create policy "enrollments_update_teacher" on public.enrollments
  for update using ((select public.is_teacher())) with check ((select public.is_teacher()));
create policy "enrollments_delete_teacher" on public.enrollments
  for delete using ((select public.is_teacher()));
