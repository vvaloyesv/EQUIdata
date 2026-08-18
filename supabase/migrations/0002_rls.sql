-- EQUIdata — RLS y trigger de rol
--
-- Principio de paridad: `MockRepository` hoy no aplica NINGÚN control de
-- lectura (cada sesión de navegador tiene en memoria todo el seed) — el
-- profesor es "una cuenta con todos los permisos" y el resto de reglas
-- (curso publicado, inscripción abierta, sesión bloqueada) son lógica de
-- negocio de la app (`src/lib/logic/`), no del repositorio. Por eso el
-- contenido (cursos/sesiones/módulos/evaluaciones/preguntas/retos) es de
-- **lectura abierta a cualquier usuario autenticado** aquí — igual que hoy —
-- y lo nuevo de verdad es la **escritura protegida** (solo profesor) y el
-- aislamiento de los **datos personales** de cada estudiante (progreso,
-- intentos, mensajes, perfil), que hoy ya son "propios" en la práctica pero
-- sin nada que lo garantizara a nivel de datos.

-- ────────────────────────────────────────────────────────────────
-- Helper: ¿el usuario autenticado es el profesor?
-- ────────────────────────────────────────────────────────────────

create or replace function public.is_teacher()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

-- ────────────────────────────────────────────────────────────────
-- Trigger: crear el perfil al primer login (reemplaza `isTeacherEmail()`)
-- ────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  -- Mismo correo fijo que hoy vive en `src/lib/auth/teacherEmail.ts` — si
  -- cambia, hay que actualizar aquí también (y esto no reasigna roles ya
  -- creados, solo aplica a cuentas nuevas).
  v_role := case
    when new.email = 'vvaloyes@fundacionwwbcol.org' then 'teacher'
    else 'student'
  end;

  insert into public.profiles (id, email, role, display_name)
  values (new.id, new.email, v_role, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────
-- Activar RLS en todas las tablas
-- ────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.onboarding_field_defs enable row level security;
alter table public.area_options enable row level security;
alter table public.courses enable row level security;
alter table public.sessions enable row level security;
alter table public.modules enable row level security;
alter table public.archetypes enable row level security;
alter table public.evaluations enable row level security;
alter table public.learning_outcomes enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.enrollments enable row level security;
alter table public.module_progress enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.outcome_scores enable row level security;
alter table public.bonus_attempts enable row level security;
alter table public.messages enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_replies enable row level security;
alter table public.certificates enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.mood_entries enable row level security;

-- ────────────────────────────────────────────────────────────────
-- profiles — lectura abierta (se necesita el nombre en mensajes/comunidad/
-- roster del profesor); escritura solo profesor; creación solo por el
-- trigger (security definer, no necesita policy de insert).
-- ────────────────────────────────────────────────────────────────

create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_teacher" on public.profiles
  for update using (public.is_teacher()) with check (public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- student_profiles — dato personal: dueño o profesor
-- ────────────────────────────────────────────────────────────────

create policy "student_profiles_own_or_teacher" on public.student_profiles
  for all
  using (auth.uid() = user_id or public.is_teacher())
  with check (auth.uid() = user_id or public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- Configuración (listas fijas): lectura abierta, escritura solo profesor
-- ────────────────────────────────────────────────────────────────

create policy "onboarding_field_defs_select" on public.onboarding_field_defs
  for select using (auth.uid() is not null);
create policy "onboarding_field_defs_write_teacher" on public.onboarding_field_defs
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "area_options_select" on public.area_options
  for select using (auth.uid() is not null);
create policy "area_options_write_teacher" on public.area_options
  for all using (public.is_teacher()) with check (public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- Contenido de cursos: lectura abierta a cualquier autenticado
-- (paridad con Mock — la gating de "publicado"/"bloqueada" es lógica de
-- negocio en la app, no del repositorio), escritura solo profesor.
-- ────────────────────────────────────────────────────────────────

create policy "courses_select" on public.courses
  for select using (auth.uid() is not null);
create policy "courses_write_teacher" on public.courses
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "sessions_select" on public.sessions
  for select using (auth.uid() is not null);
create policy "sessions_write_teacher" on public.sessions
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "modules_select" on public.modules
  for select using (auth.uid() is not null);
create policy "modules_write_teacher" on public.modules
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "archetypes_select" on public.archetypes
  for select using (auth.uid() is not null);
create policy "archetypes_write_teacher" on public.archetypes
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "evaluations_select" on public.evaluations
  for select using (auth.uid() is not null);
create policy "evaluations_write_teacher" on public.evaluations
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "learning_outcomes_select" on public.learning_outcomes
  for select using (auth.uid() is not null);
create policy "learning_outcomes_write_teacher" on public.learning_outcomes
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "questions_select" on public.questions
  for select using (auth.uid() is not null);
create policy "questions_write_teacher" on public.questions
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "question_options_select" on public.question_options
  for select using (auth.uid() is not null);
create policy "question_options_write_teacher" on public.question_options
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "challenges_select" on public.challenges
  for select using (auth.uid() is not null);
create policy "challenges_write_teacher" on public.challenges
  for all using (public.is_teacher()) with check (public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- Inscripción y progreso — dato personal: dueño o profesor
-- ────────────────────────────────────────────────────────────────

create policy "enrollments_own_or_teacher" on public.enrollments
  for all
  using (auth.uid() = user_id or public.is_teacher())
  with check (auth.uid() = user_id or public.is_teacher());

create policy "module_progress_own_or_teacher" on public.module_progress
  for all
  using (auth.uid() = user_id or public.is_teacher())
  with check (auth.uid() = user_id or public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- Intentos y respuestas — dueño del intento o profesor
-- ────────────────────────────────────────────────────────────────

create policy "attempts_own_or_teacher" on public.attempts
  for all
  using (auth.uid() = user_id or public.is_teacher())
  with check (auth.uid() = user_id or public.is_teacher());

create policy "answers_own_or_teacher" on public.answers
  for all
  using (
    public.is_teacher()
    or exists (select 1 from public.attempts a where a.id = answers.attempt_id and a.user_id = auth.uid())
  )
  with check (
    public.is_teacher()
    or exists (select 1 from public.attempts a where a.id = answers.attempt_id and a.user_id = auth.uid())
  );

create policy "outcome_scores_own_or_teacher" on public.outcome_scores
  for all
  using (
    public.is_teacher()
    or exists (select 1 from public.attempts a where a.id = outcome_scores.attempt_id and a.user_id = auth.uid())
  )
  with check (
    public.is_teacher()
    or exists (select 1 from public.attempts a where a.id = outcome_scores.attempt_id and a.user_id = auth.uid())
  );

create policy "bonus_attempts_select_own_or_teacher" on public.bonus_attempts
  for select using (auth.uid() = user_id or public.is_teacher());
create policy "bonus_attempts_write_teacher" on public.bonus_attempts
  for all using (public.is_teacher()) with check (public.is_teacher());

create policy "challenge_attempts_own_or_teacher" on public.challenge_attempts
  for all
  using (auth.uid() = user_id or public.is_teacher())
  with check (auth.uid() = user_id or public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- Mensajes — separado por acción para que nadie pueda suplantar al
-- remitente ni marcar como leído un mensaje ajeno.
-- ────────────────────────────────────────────────────────────────

create policy "messages_select" on public.messages
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id or public.is_teacher());

create policy "messages_insert" on public.messages
  for insert with check (auth.uid() = from_user_id or public.is_teacher());

create policy "messages_update_read" on public.messages
  for update
  using (auth.uid() = to_user_id or public.is_teacher())
  with check (auth.uid() = to_user_id or public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- Comunidad — lectura pública (entre autenticados), escritura solo del
-- propio autor.
-- ────────────────────────────────────────────────────────────────

create policy "community_posts_select" on public.community_posts
  for select using (auth.uid() is not null);
create policy "community_posts_insert" on public.community_posts
  for insert with check (auth.uid() = author_id);

create policy "community_replies_select" on public.community_replies
  for select using (auth.uid() is not null);
create policy "community_replies_insert" on public.community_replies
  for insert with check (auth.uid() = author_id);

create policy "community_likes_select" on public.community_likes
  for select using (auth.uid() is not null);
create policy "community_likes_insert" on public.community_likes
  for insert with check (auth.uid() = user_id);
create policy "community_likes_delete" on public.community_likes
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- Certificados — lectura PÚBLICA (incluye visitantes anónimos: la página
-- /verify/[code] verifica autenticidad sin necesitar sesión, ese es su
-- propósito). Escritura: el propio dueño (tras validar elegibilidad en la
-- app, igual que hoy) o el profesor.
-- ────────────────────────────────────────────────────────────────

create policy "certificates_select_public" on public.certificates
  for select using (true);

create policy "certificates_write_own_or_teacher" on public.certificates
  for insert with check (auth.uid() = user_id or public.is_teacher());

-- ────────────────────────────────────────────────────────────────
-- Ánimo diario — dato personal: dueño o profesor
-- ────────────────────────────────────────────────────────────────

create policy "mood_entries_own_or_teacher" on public.mood_entries
  for all
  using (auth.uid() = user_id or public.is_teacher())
  with check (auth.uid() = user_id or public.is_teacher());
