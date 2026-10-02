"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Camera, LogOut, MoreHorizontal, Settings, X, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Separador visual antes de este ítem. */
  groupStart?: boolean;
  /** Contador (p. ej. mensajes sin leer). */
  badge?: number;
  /** En celular va en la barra inferior (máximo 4); el resto queda en "Más". */
  mobile?: boolean;
  /** Etiqueta corta para la barra inferior del celular (p. ej. "Notas"). */
  mobileLabel?: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Navegación de la app (U1 · 24/09/2026).
 * - Escritorio (≥1024 px): barra lateral navy con el logo arriba, la
 *   navegación y el perfil compacto al pie, que abre el menú de cuenta.
 * - Celular: barra superior con logo y avatar, y barra inferior con los
 *   destinos marcados `mobile` + "Más" (todo lo demás y la cuenta).
 */
export function SidebarNav({
  items,
  profileName,
  profileSubtitle,
  streakDays,
  avatarUrl,
  onAvatarChange,
  avatarUploading,
  settingsHref,
  onLogout,
}: {
  items: NavItem[];
  profileName: string;
  profileSubtitle: string;
  /** Racha real de días consecutivos con actividad. Sin este prop (p. ej. profesor) no se muestra. */
  streakDays?: number;
  avatarUrl?: string;
  /** Si se provee, el menú de cuenta ofrece cambiar la foto. */
  onAvatarChange?: (file: File) => void;
  avatarUploading?: boolean;
  settingsHref: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Cambiar de pantalla cierra cualquier menú abierto.
  useEffect(() => {
    setAccountOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const mobileItems = items.filter((it) => it.mobile).slice(0, 4);
  const moreActive = !mobileItems.some((it) => isActive(pathname, it.href));
  const streak = streakDays && streakDays > 0 ? streakDays : 0;

  const fileInput = onAvatarChange && (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onAvatarChange(file);
        e.target.value = "";
      }}
    />
  );

  const accountMenu = (
    <div className="space-y-0.5 text-[var(--color-navy)]">
      {onAvatarChange && (
        <button
          type="button"
          disabled={avatarUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-navy-tint)] disabled:opacity-50"
        >
          <Camera size={17} /> {avatarUploading ? "Subiendo foto…" : "Cambiar foto"}
        </button>
      )}
      <Link
        href={settingsHref}
        className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-navy-tint)]"
      >
        <Settings size={17} /> Configuración de la cuenta
      </Link>
      <div className="my-1 h-px bg-[var(--color-divider)]" />
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-coral-tint)]"
      >
        <LogOut size={17} /> Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {fileInput}

      {/* ─── Escritorio ─────────────────────────────────────────── */}
      <aside className="hidden h-dvh w-64 shrink-0 flex-col bg-[var(--color-navy)] text-white lg:flex">
        <div className="px-6 pb-2 pt-6">
          <Image src="/brand/logo-negativo.png" alt="EQUIdata" width={124} height={41} priority />
        </div>

        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Principal">
          {items.map((it) => {
            const active = isActive(pathname, it.href);
            const Icon = it.icon;
            return (
              <div key={it.href}>
                {it.groupStart && <div className="mx-3 my-2 h-px bg-white/10" />}
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-token)] px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--color-lime)] font-medium text-[var(--color-navy)]"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon size={18} />
                  <span className="flex-1">{it.label}</span>
                  {it.badge ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-coral)] px-1.5 text-xs font-medium text-white">
                      {it.badge}
                    </span>
                  ) : null}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Perfil compacto: abre el menú de cuenta hacia arriba. */}
        <div className="relative border-t border-white/10 p-3">
          {accountOpen && (
            <div className="absolute bottom-[calc(100%-4px)] left-3 right-3 z-30 rounded-[var(--radius-card)] bg-white p-2 shadow-[0_16px_40px_-20px_rgba(15,28,77,0.6)]">
              {accountMenu}
            </div>
          )}
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            className="flex w-full items-center gap-3 rounded-[var(--radius-token)] px-2 py-2 text-left transition-colors hover:bg-white/10"
          >
            <Avatar
              name={profileName}
              avatarUrl={avatarUrl}
              size={36}
              className="bg-[var(--color-lavender-tint)]"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{profileName}</span>
              <span className="block truncate font-mono text-[0.625rem] uppercase tracking-[0.1em] text-white/55">
                {profileSubtitle}
              </span>
            </span>
            {streak > 0 && (
              <span
                className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-[var(--color-lime)]"
                title={`${streak} ${streak === 1 ? "día seguido" : "días seguidos"}`}
              >
                <Zap size={12} fill="currentColor" /> {streak}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ─── Celular: barra superior ──────────────────────────────── */}
      <header
        className="flex shrink-0 items-center justify-between bg-[var(--color-navy)] px-4 pb-2.5 text-white lg:hidden"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
      >
        <Image src="/brand/logo-negativo.png" alt="EQUIdata" width={104} height={34} priority />
        <div className="relative flex items-center gap-3">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-[var(--color-lime)]">
              <Zap size={12} fill="currentColor" /> {streak}
            </span>
          )}
          <button
            type="button"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            aria-label="Tu cuenta"
            className="rounded-full"
          >
            <Avatar name={profileName} avatarUrl={avatarUrl} size={32} className="bg-[var(--color-lavender-tint)]" />
          </button>
          {accountOpen && (
            <div className="absolute right-0 top-11 z-40 w-64 rounded-[var(--radius-card)] bg-white p-2 shadow-[0_16px_40px_-20px_rgba(15,28,77,0.6)]">
              <div className="px-3 pb-2 pt-1">
                <p className="truncate text-sm font-medium text-[var(--color-navy)]">{profileName}</p>
                <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.1em] text-[var(--color-muted)]">
                  {profileSubtitle}
                </p>
              </div>
              {accountMenu}
            </div>
          )}
        </div>
      </header>

      {/* ─── Celular: barra inferior ──────────────────────────────── */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-divider)] bg-white lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {mobileItems.map((it) => {
          const active = isActive(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[0.6875rem]",
                active ? "text-[var(--color-navy)]" : "text-[var(--color-muted)]",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-[var(--radius-pill)]",
                  active && "bg-[var(--color-lime)]",
                )}
              >
                <Icon size={18} />
              </span>
              <span className="max-w-full truncate">{it.mobileLabel ?? it.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[0.6875rem]",
            moreActive ? "text-[var(--color-navy)]" : "text-[var(--color-muted)]",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-12 items-center justify-center rounded-[var(--radius-pill)]",
              moreActive && "bg-[var(--color-lime)]",
            )}
          >
            <MoreHorizontal size={18} />
          </span>
          Más
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-[var(--color-navy)]/40"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[20px] bg-white px-3 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="label-mono">Todas las secciones</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-canvas)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {items.map((it) => {
                const active = isActive(pathname, it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[var(--radius-token)] px-3 py-3 text-sm text-[var(--color-navy)]",
                      active ? "bg-[var(--color-lime-tint)] font-medium" : "hover:bg-[var(--color-canvas)]",
                    )}
                  >
                    <Icon size={17} className="shrink-0" /> <span className="truncate">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Marco común de los paneles con navegación: en escritorio, barra lateral +
 * contenido con su propio scroll; en celular, barra superior + contenido +
 * barra inferior fija (el contenido deja espacio para ella).
 */
export function AppFrame({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {nav}
      <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-canvas)] pb-[calc(env(safe-area-inset-bottom,0px)+72px)] lg:pb-0">
        {children}
      </main>
    </div>
  );
}
