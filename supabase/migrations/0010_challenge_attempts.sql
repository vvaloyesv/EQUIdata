
drop policy if exists "challenge_attempts_own_or_teacher" on public.challenge_attempts;
drop policy if exists "challenge_attempts_select_own_or_teacher" on public.challenge_attempts;
drop policy if exists "challenge_attempts_insert_teacher" on public.challenge_attempts;
drop policy if exists "challenge_attempts_update_teacher" on public.challenge_attempts;
drop policy if exists "challenge_attempts_delete_teacher" on public.challenge_attempts;
create policy "challenge_attempts_select_own_or_teacher" on public.challenge_attempts
  for select using ((select auth.uid()) = user_id or (select public.is_teacher()));
create policy "challenge_attempts_insert_teacher" on public.challenge_attempts
  for insert with check ((select public.is_teacher()));
create policy "challenge_attempts_update_teacher" on public.challenge_attempts
  for update using ((select public.is_teacher())) with check ((select public.is_teacher()));
create policy "challenge_attempts_delete_teacher" on public.challenge_attempts
  for delete using ((select public.is_teacher()));

-- El puntaje nunca supera el total, venga de donde venga.
alter table public.challenge_attempts
  drop constraint if exists challenge_attempts_score_range;
alter table public.challenge_attempts
  add constraint challenge_attempts_score_range check (total > 0 and score >= 0 and score <= total);
