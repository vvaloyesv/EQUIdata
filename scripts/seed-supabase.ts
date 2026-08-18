/**
 * Siembra Supabase con el mismo contenido de `src/lib/data/mock/seed.ts`
 * (reutilizado directamente, no duplicado) para que la demo se vea igual el
 * primer día con datos reales.
 *
 * Los IDs de negocio (cursos, sesiones, módulos, evaluaciones...) se
 * mantienen igual que en el seed (son `text` en Postgres). Los IDs de
 * *usuario* no se pueden mantener: Supabase Auth genera un `uuid` real al
 * crear cada cuenta, así que este script arma un `idMap` de
 * "id del seed" → "uuid real" y lo usa en cada referencia a un usuario
 * (enrollments, module_progress, attempts, mensajes, comunidad, certificados).
 *
 * Los 4 estudiantes de relleno del seed (solo para poblar tablas del
 * profesor) también obtienen una cuenta real de Auth — es la única forma de
 * cumplir la FK `profiles.id → auth.users.id`; en la práctica nunca inician
 * sesión.
 *
 * Uso: node --experimental-strip-types --env-file=.env.local scripts/seed-supabase.ts
 * Idempotente: se puede correr más de una vez sin duplicar filas (upsert) ni
 * recrear cuentas ya existentes.
 */

import { createClient } from "@supabase/supabase-js";
import * as seed from "../src/lib/data/mock/seed.ts";
import { AREA_OPTIONS } from "../src/lib/brand/lists.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Corre con --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function run(label: string, promise: Promise<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  console.log(`  ✓ ${label}`);
}

/** Reutiliza la cuenta si ya existe (busca por correo en `profiles`); si no, la crea. */
async function ensureAuthUser(email: string, displayName: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (findError) throw new Error(`Buscando ${email}: ${findError.message}`);
  if (existing) return existing.id as string;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });
  if (error || !data.user) throw new Error(`Creando ${email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  console.log("1/9 Cuentas reales (Auth + trigger de rol)...");
  const idMap: Record<string, string> = {};
  for (const u of seed.users) {
    idMap[u.id] = await ensureAuthUser(u.email, u.displayName);
    // Sincroniza también en reejecuciones (p. ej. una cuenta creada a mano
    // antes de tener el metadata `full_name`, como pasó con la del profesor
    // durante las pruebas del esquema).
    await run(
      `perfil de ${u.email}`,
      supabase
        .from("profiles")
        .update({ display_name: u.displayName, last_seen: u.lastSeen ?? null })
        .eq("id", idMap[u.id]),
    );
  }

  console.log("2/9 student_profiles...");
  await run(
    "student_profiles",
    supabase.from("student_profiles").upsert(
      seed.studentProfiles.map((p) => ({
        user_id: idMap[p.userId],
        nombres: p.nombres,
        apellidos: p.apellidos,
        cargo: p.cargo,
        area: p.area,
        cedula: p.cedula ?? null,
        custom_fields: p.customFields ?? null,
        completed: p.completed,
        show_name_in_community: p.showNameInCommunity ?? null,
        notify_unread_messages: p.notifyUnreadMessages ?? null,
        notify_streak_reminder: p.notifyStreakReminder ?? null,
      })),
    ),
  );

  console.log("3/9 area_options...");
  await run(
    "area_options",
    supabase.from("area_options").upsert(AREA_OPTIONS.map((value) => ({ value }))),
  );

  console.log("4/9 courses / sessions / modules...");
  await run(
    "courses",
    supabase.from("courses").upsert(
      seed.courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        certificate_description: c.certificateDescription ?? null,
        certificate_duration_hours: c.certificateDurationHours ?? null,
        cover_url: c.coverUrl ?? null,
        published: c.published,
        enrollment_open: c.enrollmentOpen,
        teacher_name: c.teacherName,
      })),
    ),
  );
  await run(
    "sessions",
    supabase.from("sessions").upsert(
      seed.sessions.map((s) => ({
        id: s.id,
        course_id: s.courseId,
        order_index: s.order,
        title: s.title,
        unlock_date: s.unlockDate ?? null,
      })),
    ),
  );
  await run(
    "modules",
    supabase.from("modules").upsert(
      seed.modules.map((m) => ({
        id: m.id,
        session_id: m.sessionId,
        context: m.context,
        order_index: m.order,
        type: m.type,
        title: m.title,
        description: m.description,
        video_url: m.videoUrl ?? null,
        content_html: m.contentHtml ?? null,
        duration_min: m.durationMin ?? null,
      })),
    ),
  );

  console.log("5/9 evaluations / outcomes / questions / options...");
  await run(
    "evaluations",
    supabase.from("evaluations").upsert(
      seed.evaluations.map((e) => ({
        id: e.id,
        course_id: e.courseId ?? null,
        session_id: e.sessionId ?? null,
        tutorial_module_id: e.tutorialModuleId ?? null,
        kind: e.kind,
        title: e.title,
        max_attempts: e.maxAttempts,
        wait_hours: e.waitHours,
        passing_score: e.passingScore ?? null,
        is_active: e.isActive,
        placement_after_module_id: e.placementAfterModuleId ?? null,
      })),
    ),
  );
  await run(
    "learning_outcomes",
    supabase.from("learning_outcomes").upsert(
      seed.outcomes.map((o) => ({
        id: o.id,
        evaluation_id: o.evaluationId,
        code: o.code,
        name: o.name,
        expected_level: o.expectedLevel,
      })),
    ),
  );
  await run(
    "questions",
    supabase.from("questions").upsert(
      seed.questions.map((q) => ({
        id: q.id,
        evaluation_id: q.evaluationId,
        order_index: q.order,
        type: q.type,
        text: q.text,
        image_url: q.imageUrl ?? null,
        points: q.points,
        outcome_id: q.outcomeId ?? null,
        correct_value: q.correctValue ?? null,
        tolerance: q.tolerance ?? null,
      })),
    ),
  );
  await run(
    "question_options",
    supabase.from("question_options").upsert(
      seed.questionOptions.map((o) => ({
        id: o.id,
        question_id: o.questionId,
        text: o.text,
        image_url: o.imageUrl ?? null,
        is_correct: o.isCorrect ?? null,
        correct_rank: o.correctRank ?? null,
        archetype_id: o.archetypeId ?? null,
      })),
    ),
  );

  console.log("6/9 enrollments / module_progress...");
  await run(
    "enrollments",
    supabase.from("enrollments").upsert(
      seed.enrollments.map((e) => ({
        user_id: idMap[e.userId],
        course_id: e.courseId,
        enrolled_at: e.enrolledAt,
      })),
    ),
  );
  await run(
    "module_progress",
    supabase.from("module_progress").upsert(
      seed.moduleProgress.map((p) => ({
        user_id: idMap[p.userId],
        module_id: p.moduleId,
        completed: p.completed,
        completed_at: p.completedAt ?? null,
      })),
    ),
  );

  console.log("7/9 attempts / answers / outcome_scores...");
  await run(
    "attempts",
    supabase.from("attempts").upsert(
      seed.attempts.map((a) => ({
        id: a.id,
        user_id: idMap[a.userId],
        evaluation_id: a.evaluationId,
        started_at: a.startedAt,
        submitted_at: a.submittedAt ?? null,
        score: a.score ?? null,
        status: a.status,
      })),
    ),
  );
  await run(
    "answers",
    supabase.from("answers").upsert(
      seed.answers.map((a) => ({
        id: a.id,
        attempt_id: a.attemptId,
        question_id: a.questionId,
        selected_option_ids: a.selectedOptionIds ?? null,
        open_text: a.openText ?? null,
        scale_value: a.scaleValue ?? null,
        ranking_order: a.rankingOrder ?? null,
        points_awarded: a.pointsAwarded ?? null,
        is_correct: a.isCorrect ?? null,
      })),
    ),
  );
  await run(
    "outcome_scores",
    supabase.from("outcome_scores").upsert(
      seed.outcomeScores.map((s) => ({
        attempt_id: s.attemptId,
        outcome_id: s.outcomeId,
        expected: s.expected,
        achieved: s.achieved,
      })),
    ),
  );

  console.log("8/9 messages / certificates / comunidad / retos...");
  await run(
    "messages",
    supabase.from("messages").upsert(
      seed.messages.map((m) => ({
        id: m.id,
        from_user_id: idMap[m.fromUserId],
        to_user_id: idMap[m.toUserId],
        course_id: m.courseId ?? null,
        body: m.body,
        created_at: m.createdAt,
        read: m.read,
      })),
    ),
  );
  await run(
    "certificates",
    supabase.from("certificates").upsert(
      seed.certificates.map((c) => ({
        code: c.code,
        user_id: idMap[c.userId],
        course_id: c.courseId,
        student_name: c.studentName,
        course_title: c.courseTitle,
        course_description: c.courseDescription,
        teacher_name: c.teacherName,
        duration_min: c.durationMin,
        issued_at: c.issuedAt,
      })),
    ),
  );
  await run(
    "community_posts",
    supabase.from("community_posts").upsert(
      seed.communityPosts.map((p) => ({
        id: p.id,
        author_id: idMap[p.authorId],
        body: p.body,
        category: p.category ?? null,
        created_at: p.createdAt,
      })),
    ),
  );
  await run(
    "community_likes",
    supabase.from("community_likes").upsert(
      seed.communityLikes.map((l) => ({
        post_id: l.postId,
        user_id: idMap[l.userId],
        created_at: l.createdAt,
      })),
    ),
  );
  await run(
    "community_replies",
    supabase.from("community_replies").upsert(
      seed.communityReplies.map((r) => ({
        id: r.id,
        post_id: r.postId,
        author_id: idMap[r.authorId],
        body: r.body,
        created_at: r.createdAt,
      })),
    ),
  );
  await run(
    "challenges",
    supabase.from("challenges").upsert(
      seed.challenges.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        content_html: c.contentHtml,
        created_at: c.createdAt,
      })),
    ),
  );

  console.log("9/9 Listo. Mapeo de cuentas creadas:");
  for (const [seedId, realId] of Object.entries(idMap)) {
    const u = seed.users.find((x) => x.id === seedId)!;
    console.log(`  ${seedId} (${u.email}) → ${realId}`);
  }
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
