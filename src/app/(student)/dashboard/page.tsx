"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { queryKeys, useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { buildDashboard, type CourseProgress, type RouteState } from "@/lib/student/dashboard";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ProgressBar } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { PageBody } from "@/components/ui/Page";
import { RouteHistogram } from "@/components/ui/Charts";
import { CommunityVoicesCard } from "@/components/student/CommunityVoicesCard";
import { MoodTrackerCard } from "@/components/student/MoodTrackerCard";
import { BadgeCard } from "@/components/student/BadgeCard";
import { daysUntil, formatDayMonth, relativeDays } from "@/lib/dates";

export default function DashboardPage() {
  const { user } = useAuth();
  const refresh = useRefresh();
  const userId = user?.id ?? "";

  const { data, loading } = useRepoQuery(
    queryKeys.dashboard(userId),
    () =>
      buildDashboard(getRepository(), userId, user?.displayName ?? "", new Date().toISOString()),
    { enabled: !!user },
  );
  const { data: profile } = useRepoQuery(
    queryKeys.studentProfile(userId),
    () => getRepository().getStudentProfile(userId),
    { enabled: !!user },
  );

  if (loading || !data) {
    return <BrandLoader label="Preparando tu dashboard..." />;
  }

  const { greetingName, stats, route, courses, reviewModules, reviewCourseId, events, streakDays, currentMood } =
    data;

  const showStreakReminder = profile?.notifyStreakReminder !== false && streakDays > 0;
  const today = new Date()
    .toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
    .replace(/\./g, "");
  const upcomingEvents = events.filter((ev) => daysUntil(ev.date) >= 0);

  return (
    <div>
      <PageBody>
        {/* Encabezado claro: el dashboard es la pantalla de bienvenida, sin banda navy. */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="min-w-0">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {today}
              {showStreakReminder && (
                <span className="text-[var(--color-lime-text)]">
                  {" "}
                  · {streakDays} {streakDays === 1 ? "día seguido" : "días seguidos"}
                </span>
              )}
            </p>
            <h1 className="mt-2 text-balance font-display text-3xl leading-tight text-[var(--color-navy)] lg:text-4xl">
              Hola, {greetingName}
              <span className="text-[var(--color-coral)]">.</span>
            </h1>
            {showStreakReminder && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Completa un módulo hoy para llegar a {streakDays + 1} días seguidos.
              </p>
            )}
          </div>
          <dl className="flex gap-8 sm:gap-10">
            {[
              { value: stats.inProgress, label: "En progreso" },
              { value: stats.completed, label: "Completados" },
              { value: `${stats.average}%`, label: "Avance promedio" },
            ].map((st) => (
              <div key={st.label}>
                <dd className="font-display text-3xl tabular-nums leading-none text-[var(--color-navy)]">
                  {st.value}
                </dd>
                <dt className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {st.label}
                </dt>
              </div>
            ))}
          </dl>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_1fr]">
          <RouteCard route={route} />

          {/* En repaso (calculado desde el progreso) */}
          <Card bordered>
            <div className="flex items-center justify-between">
              <Label>En repaso · {reviewModules.length} {reviewModules.length === 1 ? "clase" : "clases"}</Label>
            </div>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Vuelve a lo que viste en tus últimas sesiones.
            </p>

            <div className="mt-4 divide-y divide-[var(--color-divider)]">
              {reviewModules.length === 0 && (
                <p className="py-2 text-sm text-[var(--color-hint)]">
                  Completa una sesión para ver tu repaso.
                </p>
              )}
              {reviewModules.slice(0, 3).map((m) => (
                <Link
                  key={m.id}
                  href={`/courses/${reviewCourseId}?module=${encodeURIComponent(m.id)}`}
                  className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Label>
                      {m.type === "video" ? "Video" : "HTML"} · {m.durationMin ?? 10} min
                    </Label>
                    <p className="mt-0.5 truncate text-sm text-[var(--color-navy)] group-hover:underline">
                      {m.title}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy-tint)] text-[var(--color-navy)] transition-colors group-hover:bg-[var(--color-navy)] group-hover:text-white"
                  >
                    <Play size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Mis cursos */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <Label>Mis cursos · {courses.length}</Label>
              <Link href="/courses" className="text-sm text-[var(--color-lavender-text)] hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="space-y-3">
              {courses.length === 0 && (
                <Card bordered>
                  <p className="text-sm text-[var(--color-muted)]">Todavía no tienes cursos.</p>
                </Card>
              )}
              {courses.map((c) => (
                <Link key={c.course.id} href={`/courses/${c.course.id}`} className="block">
                  <Card bordered className="transition-colors hover:border-[var(--color-lavender)]">
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--color-navy)]">{c.course.title}</p>
                        <div className="mt-1">
                          <Label>
                            {c.location} · {c.completedModules}/{c.totalModules} módulos
                          </Label>
                        </div>
                        <ProgressBar value={c.percent} className="mt-2.5" />
                      </div>
                      <div className="w-16 text-right">
                        {c.notStarted ? (
                          <Badge tone="locked">Sin empezar</Badge>
                        ) : (
                          <div className="font-display text-xl tabular-nums text-[var(--color-navy)]">
                            {c.percent}%
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Próximos eventos */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <Label>Próximas fechas · {upcomingEvents.length}</Label>
              <Link href="/calendar" className="text-sm text-[var(--color-lavender-text)] hover:underline">
                Ver calendario
              </Link>
            </div>
            <Card bordered className="p-0">
              {upcomingEvents.length === 0 ? (
                <p className="p-6 text-sm text-[var(--color-muted)]">
                  No hay fechas próximas en tus cursos.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-divider)]">
                  {upcomingEvents.slice(0, 4).map((ev, i) => (
                    <li key={ev.id} className="flex items-center gap-4 px-6 py-3.5">
                      <div className="w-12 shrink-0 text-center">
                        <div className="font-display text-xl tabular-nums leading-none text-[var(--color-navy)]">
                          {new Date(ev.date).getDate()}
                        </div>
                        <div className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--color-muted)]">
                          {new Date(ev.date).toLocaleString("es-CO", { month: "short" }).replace(".", "")}
                        </div>
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm text-[var(--color-navy)]">{ev.title}</p>
                      <span
                        className={
                          i === 0
                            ? "shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-navy)] px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-white"
                            : "shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-[var(--color-muted)]"
                        }
                      >
                        {relativeDays(ev.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <div className="mt-6">
          <MoodTrackerCard currentMood={currentMood} onMoodSaved={() => void refresh()} />
        </div>
        <div className="mt-6">
          <CommunityVoicesCard />
        </div>
        {user && (
          <div className="mt-6">
            <BadgeCard userId={user.id} displayName={greetingName} />
          </div>
        )}
      </PageBody>
    </div>
  );
}

/** "Tu ruta": la próxima acción concreta según el estado real del curso. */
function RouteCard({ route }: { route: RouteState }) {
  if (route.kind === "none") {
    return (
      <Card bordered>
        <Label>Tu ruta</Label>
        <h2 className="mt-3 font-display text-2xl text-[var(--color-navy)]">Todavía no tienes cursos.</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Inscríbete en uno de los cursos publicados para empezar tu ruta.
        </p>
        <Link href="/courses" className="mt-5 inline-block">
          <Button>
            Ver cursos disponibles <ArrowRight size={15} />
          </Button>
        </Link>
      </Card>
    );
  }

  const c: CourseProgress = route.course;
  const modulesLeft = c.totalModules - c.completedModules;
  const resumeHref = c.nextModuleId
    ? `/courses/${c.course.id}?module=${encodeURIComponent(c.nextModuleId)}`
    : `/courses/${c.course.id}`;

  let eyebrow: string;
  let body: React.ReactNode;
  let action: React.ReactNode;
  if (route.kind === "in_progress") {
    eyebrow = `Sigue donde lo dejaste · ${c.location}`;
    body = `${modulesLeft} ${modulesLeft === 1 ? "módulo" : "módulos"} por completar.`;
    action = (
      <Link href={resumeHref}>
        <Button>
          Reanudar clase <Play size={14} />
        </Button>
      </Link>
    );
  } else if (route.kind === "not_started") {
    eyebrow = `Sin empezar · 0/${c.totalModules} módulos`;
    body = "Tu primer módulo te espera.";
    action = (
      <Link href={resumeHref}>
        <Button>
          Empezar el curso <ArrowRight size={15} />
        </Button>
      </Link>
    );
  } else if (route.kind === "up_to_date") {
    eyebrow = `Al día · ${c.completedModules}/${c.totalModules} módulos liberados`;
    body = c.nextUnlock ? (
      <>
        Hiciste todo lo disponible. La sesión {String(c.nextUnlock.order).padStart(2, "0")} ·{" "}
        {c.nextUnlock.title} se libera el {formatDayMonth(c.nextUnlock.date)} (
        {relativeDays(c.nextUnlock.date).toLowerCase()}).
      </>
    ) : (
      "Hiciste todo lo disponible. Las sesiones que faltan todavía no tienen contenido."
    );
    action = (
      <Link href={`/courses/${c.course.id}`}>
        <Button variant="secondary">
          Ver el curso <ArrowRight size={15} />
        </Button>
      </Link>
    );
  } else {
    eyebrow = `Curso completo · ${c.completedModules}/${c.totalModules} módulos`;
    body = c.nextUnlock ? (
      <>
        La sesión {String(c.nextUnlock.order).padStart(2, "0")} · {c.nextUnlock.title} se libera el{" "}
        {formatDayMonth(c.nextUnlock.date)} ({relativeDays(c.nextUnlock.date).toLowerCase()}).
      </>
    ) : c.hasFinalDiagnostic ? (
      "Presenta el diagnóstico final para obtener tu certificado."
    ) : (
      "Terminaste todo el contenido de este curso."
    );
    action = (
      <Link href={`/courses/${c.course.id}`}>
        <Button variant="secondary">
          Ver el curso <ArrowRight size={15} />
        </Button>
      </Link>
    );
  }

  return (
    <Card bordered className="flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label
            className={
              route.kind === "complete" || route.kind === "up_to_date"
                ? "text-[var(--color-lime-text)]"
                : undefined
            }
          >
            {eyebrow}
          </Label>
          <h2 className="mt-3 text-balance font-display text-2xl leading-tight text-[var(--color-navy)]">
            {c.course.title}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-4xl tabular-nums leading-none text-[var(--color-navy)]">
            {c.percent}
            <span className="text-xl">%</span>
          </div>
          <Label>de la ruta</Label>
        </div>
      </div>

      <RouteHistogram
        sessions={c.sessions}
        labels="full"
        height={64}
        hrefFor={(s) => (s.id ? `/courses/${c.course.id}?session=${encodeURIComponent(s.id)}` : undefined)}
        className="mt-6"
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[46ch] text-sm text-[var(--color-muted)]">{body}</p>
        {action}
      </div>
    </Card>
  );
}
