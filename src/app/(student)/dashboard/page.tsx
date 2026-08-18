"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Gauge,
  HelpCircle,
  Lock,
  LogOut,
  Play,
  Settings,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildDashboard } from "@/lib/student/dashboard";
import { getUnreadMessageCount } from "@/lib/student/messages";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/LockedState";
import { CommunityVoicesCard } from "@/components/student/CommunityVoicesCard";
import { MoodTrackerCard } from "@/components/student/MoodTrackerCard";
import { BadgeCard } from "@/components/student/BadgeCard";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const { data, loading } = useAsync(
    () =>
      user
        ? buildDashboard(
            getRepository(),
            user.id,
            user.displayName,
            new Date().toISOString(),
          )
        : Promise.resolve(null),
    [user?.id, reloadKey],
  );
  const { data: profile } = useAsync(
    () =>
      user
        ? getRepository().getStudentProfile(user.id)
        : Promise.resolve(null),
    [user?.id],
  );
  const { data: unreadCount } = useAsync(
    () =>
      user
        ? getUnreadMessageCount(getRepository(), user.id)
        : Promise.resolve(0),
    [user?.id],
  );

  if (loading || !data) {
    return <BrandLoader label="Preparando tu dashboard..." />;
  }

  const {
    greetingName,
    stats,
    resume,
    courses,
    reviewModules,
    events,
    streakDays,
    currentMood,
  } = data;

  const showUnreadBell =
    profile?.notifyUnreadMessages !== false && !!unreadCount && unreadCount > 0;
  const showStreakReminder =
    profile?.notifyStreakReminder !== false && streakDays > 0;

  const profileMenuItems = [
    { label: "Mi actividad", icon: Gauge, href: undefined },
    { label: "Configuración de la cuenta", icon: Settings, href: "/settings" },
    { label: "Configuración de privacidad", icon: Lock, href: "/settings#privacidad" },
    { label: "Soporte", icon: HelpCircle, href: undefined },
  ];

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* Cabecera */}
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl text-[var(--color-navy)]">
            Hola, {greetingName}
            <span className="text-[var(--color-coral)]">.</span>
          </h1>

          <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
            {new Date().toLocaleDateString("es-CO", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>

        {/* Gamificación (fachada) */}
        <div className="flex items-center gap-6 pt-1">
          <div className="text-center">
            <div className="font-display tabular text-3xl text-[var(--color-navy)]">
              {stats.completed}
            </div>
            <Label>Completados</Label>
          </div>

          <div className="text-center">
            <div className="font-display tabular text-3xl text-[var(--color-navy)]">
              {stats.inProgress}
            </div>
            <Label>En progreso</Label>
          </div>

          <div className="text-center">
            <div className="font-display tabular text-3xl text-[var(--color-coral)]">
              {stats.average}%
            </div>
            <Label>Promedio</Label>
          </div>

          <div className="h-12 w-px bg-[var(--color-divider)]" />

          <div className="relative flex items-center gap-3">
            <Link
              href="/messages"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-white hover:text-[var(--color-navy)]"
            >
              <Bell size={18} />
              {showUnreadBell && (
                <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-[var(--color-coral)]" />
              )}
            </Link>

            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-white px-2 py-1.5 text-[var(--color-navy)] shadow-[0_1px_3px_rgba(25,41,98,0.08)] transition-colors hover:bg-[var(--color-navy-tint)]"
            >
              <Avatar name={greetingName} size={36} />
              <ChevronDown
                size={16}
                className={`transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-14 z-20 w-80 rounded-[28px] border border-[var(--color-divider)] bg-white/95 p-3 text-left text-[var(--color-navy)] shadow-[0_24px_60px_-30px_rgba(25,41,98,0.45)] backdrop-blur">
                <div className="space-y-1">
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon;
                    if (!item.href) {
                      return (
                        <button
                          key={item.label}
                          type="button"
                          disabled
                          className="flex w-full cursor-not-allowed items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm font-medium text-[var(--color-hint)]"
                        >
                          <Icon size={18} />
                          {item.label}
                          <span className="ml-auto text-xs">Próximamente</span>
                        </button>
                      );
                    }
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-navy-tint)]"
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="my-2 h-px bg-[var(--color-divider)]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-coral-tint)]"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showStreakReminder && (
        <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-token)] bg-[var(--color-lime-tint)] px-4 py-3 text-sm text-[var(--color-lime-text)]">
          <Zap size={16} fill="currentColor" />
          Vas {streakDays} {streakDays === 1 ? "día" : "días"} seguidos. ¡No
          pierdas tu racha, completa un módulo hoy!
        </div>
      )}

      {/* Sigue donde lo dejaste + En repaso */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {resume ? (
          <Card dark className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <Label className="text-[var(--color-lime)]">
                ↳ Sigue donde lo dejaste
              </Label>

              <h2 className="mt-3 font-display text-2xl leading-tight text-white">
                {resume.course.title}
              </h2>

              <p className="mt-2 text-sm text-white/60">
                {resume.location} ·{" "}
                {resume.totalModules - resume.completedModules} módulos
                restantes
              </p>

              <Link href={`/courses/${resume.course.id}`}>
                <Button className="mt-5 bg-[var(--color-lime)] text-[var(--color-navy)] hover:bg-[var(--color-lime)]/90">
                  Reanudar clase <Play size={15} />
                </Button>
              </Link>
            </div>

            <ProgressRing value={resume.percent} size={128} dark>
              <div className="text-center">
                <div className="font-display tabular text-2xl text-white">
                  {resume.percent}%
                </div>
                <Label className="text-white/50">de la ruta</Label>
              </div>
            </ProgressRing>
          </Card>
        ) : (
          <Card dark>
            <Label className="text-[var(--color-lime)]">Tu ruta</Label>

            <p className="mt-3 font-display text-xl text-white">
              Aún no has empezado. Tu primer módulo te espera.
            </p>
          </Card>
        )}

        {/* En repaso (calculado desde el progreso) */}
        <Card bordered>
          <div className="flex items-center justify-between">
            <Label>En repaso</Label>

            {reviewModules.length > 0 && (
              <Badge tone="coral">{reviewModules.length}</Badge>
            )}
          </div>

          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Práctica sugerida por lo que viste esta semana.
          </p>

          <div className="mt-4 space-y-3">
            {reviewModules.length === 0 && (
              <p className="text-sm text-[var(--color-hint)]">
                Completa una sesión para ver tu repaso.
              </p>
            )}

            {reviewModules.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Label>
                    {m.type === "video" ? "Video" : "HTML"} ·{" "}
                    {m.durationMin ?? 10} min
                  </Label>

                  <p className="truncate text-sm text-[var(--color-navy)]">
                    {m.title}
                  </p>
                </div>

                <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy-tint)] text-[var(--color-navy)] hover:bg-[var(--color-lavender-tint)]">
                  <Play size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Mis cursos + Próximos eventos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mis cursos */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <Label>Mis cursos · en progreso</Label>

            <Link
              href="/courses"
              className="text-sm text-[var(--color-lavender-text)] hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          <div className="space-y-3">
            {courses.map((c, i) => (
              <Link key={c.course.id} href={`/courses/${c.course.id}`}>
                <Card
                  bordered
                  className="transition-colors hover:border-[var(--color-lavender)]"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-display text-xl text-[var(--color-coral)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--color-navy)]">
                        {c.course.title}
                      </p>

                      <div className="mt-1">
                        <Label>{c.location}</Label>
                      </div>

                      <ProgressBar value={c.percent} className="mt-2" />
                    </div>

                    <div className="text-right">
                      {c.notStarted ? (
                        <Badge tone="locked">No iniciado</Badge>
                      ) : (
                        <>
                          <div className="font-display tabular text-lg text-[var(--color-navy)]">
                            {c.percent}%
                          </div>
                          <Label>de avance</Label>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Próximos eventos */}
        <section className="lg:mt-6">
          <div className="mb-4">
            <Label>Próximos eventos</Label>
          </div>

          <Card bordered className="p-3">
            {events.length === 0 ? (
              <EmptyState title="Sin eventos próximos" />
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {events.map((ev) => {
                  const d = new Date(ev.date);
                  const month = d
                    .toLocaleString("es-CO", { month: "short" })
                    .replace(".", "");

                  return (
                    <div
                      key={ev.id}
                      className="grid grid-cols-[64px_1fr] items-stretch gap-2"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--color-divider)]" />
                        <span className="relative flex h-2.5 w-2.5 rounded-full bg-[var(--color-lavender-text)] ring-4 ring-[var(--color-lavender-tint)]" />
                      </div>

                      <div className="rounded-[var(--radius-token)] bg-[var(--color-navy-tint)] px-3 py-2.5">
                        <div className="flex items-start gap-3">
                          <div className="flex w-10 shrink-0 flex-col items-center rounded-[10px] bg-white px-1 py-1.5 text-center shadow-[0_1px_2px_rgba(25,41,98,0.06)]">
                            <span className="font-display tabular text-lg leading-none text-[var(--color-navy)]">
                              {d.getDate()}
                            </span>
                            <span className="mt-1 font-mono text-[0.58rem] uppercase leading-none text-[var(--color-coral)]">
                              {month}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--color-navy)]">
                              {ev.title}
                            </p>

                            <div className="mt-1 flex items-center gap-1.5">
                              <CalendarDays
                                size={12}
                                className="text-[var(--color-lavender-text)]"
                              />
                              <Label>
                                {ev.kind === "unlock" ? "Liberación" : ev.kind}
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Mood Tracker — ancho completo */}
      <div className="mt-6">
        <MoodTrackerCard
          currentMood={currentMood}
          onMoodSaved={() => setReloadKey((k) => k + 1)}
        />
      </div>

      {/* Voces de la comunidad — ancho completo */}
      <div className="mt-6">
        <CommunityVoicesCard />
      </div>

      {/* Insignia — ancho completo */}
      {user && (
        <div className="mt-6">
          <BadgeCard userId={user.id} displayName={greetingName} />
        </div>
      )}
    </div>
  );
}
