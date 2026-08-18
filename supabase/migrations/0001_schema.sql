-- EQUIdata — esquema inicial de Supabase
--
-- Una tabla por tipo de `src/lib/domain/types.ts`, en snake_case. IDs de
-- entidades de negocio se mantienen como `text` (generados del lado del
-- cliente vía `crypto.randomUUID()` prefijado, igual que hoy en
-- `genId()` de `src/lib/teacher/course.ts`) para no tocar los flujos de
-- creación existentes. La única excepción es `profiles.id`, que debe ser
-- `uuid` porque referencia `auth.users.id` (lo exige Supabase Auth).
--
-- Los campos "order" de `Session`/`Module`/`Question`/`Archetype`/
-- `OnboardingFieldDef` se llaman `order_index` aquí (palabra reservada en SQL).
--
-- Fechas: se mantienen como `timestamptz`, generadas del lado del cliente
-- (`new Date().toISOString()`) igual que hoy — sin defaults server-side, para
-- no cambiar esa responsabilidad.

-- ────────────────────────────────────────────────────────────────
-- Identidad
-- ────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null check (role in ('student', 'teacher')),
  display_name text not null,
  avatar_url text,
  last_seen timestamptz
);

create table public.student_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  nombres text not null,
  apellidos text not null,
  cargo text not null,
  area text not null,
  cedula text,
  custom_fields jsonb,
  completed boolean not null default false,
  show_name_in_community boolean,
  notify_unread_messages boolean,
  notify_streak_reminder boolean
);

create table public.onboarding_field_defs (
  id text primary key,
  label text not null,
  type text not null check (type in ('text', 'select')),
  options jsonb,
  order_index int not null
);

create table public.area_options (
  value text primary key
);

-- ────────────────────────────────────────────────────────────────
-- Cursos → Sesiones → Módulos
-- ────────────────────────────────────────────────────────────────

create table public.courses (
  id text primary key,
  title text not null,
  description text not null,
  certificate_description text,
  certificate_duration_hours numeric,
  cover_url text,
  published boolean not null default false,
  enrollment_open boolean not null default true,
  teacher_name text not null
);

create table public.sessions (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  order_index int not null,
  title text not null,
  unlock_date timestamptz
);

create table public.modules (
  id text primary key,
  session_id text references public.sessions (id) on delete cascade,
  context text not null check (context in ('course', 'tutorial')),
  order_index int not null,
  type text not null check (type in ('video', 'html')),
  title text not null,
  description text not null,
  video_url text,
  content_html text,
  duration_min numeric
);

create table public.archetypes (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  name text not null,
  description text not null,
  order_index int not null
);

-- ────────────────────────────────────────────────────────────────
-- Evaluaciones: diagnósticos y quizes
-- ────────────────────────────────────────────────────────────────

create table public.evaluations (
  id text primary key,
  course_id text references public.courses (id) on delete cascade,
  session_id text references public.sessions (id) on delete set null,
  tutorial_module_id text references public.modules (id) on delete cascade,
  kind text not null check (
    kind in (
      'diagnostic_initial',
      'quiz',
      'diagnostic_final',
      'interest_onboarding',
      'tutorial_quiz'
    )
  ),
  title text not null,
  max_attempts int not null,
  wait_hours numeric not null default 0,
  passing_score numeric,
  is_active boolean not null default true,
  placement_after_module_id text references public.modules (id) on delete set null
);

create table public.learning_outcomes (
  id text primary key,
  evaluation_id text not null references public.evaluations (id) on delete cascade,
  code text not null,
  name text not null,
  expected_level numeric not null
);

create table public.questions (
  id text primary key,
  evaluation_id text not null references public.evaluations (id) on delete cascade,
  order_index int not null,
  type text not null check (type in ('single', 'multiple', 'open', 'scale', 'ranking')),
  text text not null,
  image_url text,
  points numeric not null default 0,
  outcome_id text references public.learning_outcomes (id) on delete set null,
  correct_value numeric,
  tolerance numeric
);

create table public.question_options (
  id text primary key,
  question_id text not null references public.questions (id) on delete cascade,
  text text not null,
  image_url text,
  is_correct boolean,
  correct_rank int,
  archetype_id text references public.archetypes (id) on delete set null
);

-- ────────────────────────────────────────────────────────────────
-- Inscripción, progreso e intentos
-- ────────────────────────────────────────────────────────────────

create table public.enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null,
  primary key (user_id, course_id)
);

create table public.module_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_id text not null references public.modules (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, module_id)
);

create table public.attempts (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  evaluation_id text not null references public.evaluations (id) on delete cascade,
  started_at timestamptz not null,
  submitted_at timestamptz,
  score numeric,
  status text not null check (status in ('in_progress', 'submitted'))
);

create table public.answers (
  id text primary key,
  attempt_id text not null references public.attempts (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  selected_option_ids jsonb,
  open_text text,
  scale_value numeric,
  ranking_order jsonb,
  points_awarded numeric,
  is_correct boolean
);

create table public.outcome_scores (
  attempt_id text not null references public.attempts (id) on delete cascade,
  outcome_id text not null references public.learning_outcomes (id) on delete cascade,
  expected numeric not null,
  achieved numeric not null,
  primary key (attempt_id, outcome_id)
);

-- Intentos extra otorgados manualmente por el profesor (spec §5.11 "reabrir
-- intentos"). Contador simple: cada `grantBonusAttempt` incrementa en 1.
create table public.bonus_attempts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  evaluation_id text not null references public.evaluations (id) on delete cascade,
  count int not null default 0,
  primary key (user_id, evaluation_id)
);

-- ────────────────────────────────────────────────────────────────
-- Comunicación
-- ────────────────────────────────────────────────────────────────

create table public.messages (
  id text primary key,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text references public.courses (id) on delete set null,
  body text not null,
  created_at timestamptz not null,
  read boolean not null default false
);

-- ────────────────────────────────────────────────────────────────
-- Comunidad: posts públicos, likes y respuestas
-- ────────────────────────────────────────────────────────────────

create table public.community_posts (
  id text primary key,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  category text check (category is null or category in ('preguntas', 'hallazgos', 'retos', 'celebraciones')),
  created_at timestamptz not null
);

create table public.community_likes (
  post_id text not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null,
  primary key (post_id, user_id)
);

create table public.community_replies (
  id text primary key,
  post_id text not null references public.community_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null
);

-- ────────────────────────────────────────────────────────────────
-- Certificados (spec §5.6)
-- ────────────────────────────────────────────────────────────────

create table public.certificates (
  code text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  student_name text not null,
  course_title text not null,
  course_description text not null,
  teacher_name text not null,
  duration_min numeric not null,
  issued_at timestamptz not null
);

-- ────────────────────────────────────────────────────────────────
-- Retos (HTML de autor que se autocalifica)
-- ────────────────────────────────────────────────────────────────

create table public.challenges (
  id text primary key,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('Básico', 'Intermedio', 'Avanzado')),
  content_html text not null,
  created_at timestamptz not null
);

create table public.challenge_attempts (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id text not null references public.challenges (id) on delete cascade,
  score numeric not null,
  total numeric not null,
  completed_at timestamptz not null
);

-- ────────────────────────────────────────────────────────────────
-- Gamificación: ánimo diario (la racha se deriva, no se guarda)
-- ────────────────────────────────────────────────────────────────

create table public.mood_entries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_key text not null,
  mood text not null check (
    mood in (
      'feliz', 'enojada', 'triste', 'entusiasmada', 'indiferente',
      'sorprendida', 'aburrida', 'abrumada', 'pensativa', 'enternecida',
      'divertida', 'en-desacuerdo', 'preocupada', 'asustada', 'frustrada', 'cansada'
    )
  ),
  comment text,
  created_at timestamptz not null,
  primary key (user_id, day_key)
);
