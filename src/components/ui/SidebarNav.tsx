"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Edit3, Zap, type LucideIcon } from "lucide-react";
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
}

/**
 * Barra lateral oscura fija con el perfil arriba, la navegación, y un
 * conmutador de rol (dev) al pie para saltar entre estudiante y profesor.
 */
export function SidebarNav({
  items,
  profileName,
  profileSubtitle,
  streakDays,
  avatarUrl,
  onAvatarChange,
  avatarUploading,
}: {
  items: NavItem[];
  profileName: string;
  profileSubtitle: string;
  /** Racha real de días consecutivos con actividad. Sin este prop (p. ej. profesor) no se muestra el badge. */
  streakDays?: number;
  brand?: React.ReactNode;
  avatarUrl?: string;
  /** Si se provee, el botón lápiz queda activo y dispara un selector de archivo. */
  onAvatarChange?: (file: File) => void;
  avatarUploading?: boolean;
}) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="flex h-dvh w-72 shrink-0 flex-col bg-[var(--color-navy)] text-white">
      {/* Perfil */}
      <div className="mx-3 mt-4 rounded-[28px] border border-white/16 bg-white/8 px-4 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="relative mx-auto w-fit">
          <Avatar
            name={profileName}
            avatarUrl={avatarUrl}
            size={72}
            className="bg-[var(--color-lavender-tint)] ring-2 ring-[var(--color-lime)]"
          />
          {onAvatarChange && (
            <>
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
              <button
                type="button"
                aria-label="Editar perfil"
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-coral)] text-white shadow-[0_8px_18px_-10px_rgba(0,0,0,0.8)] transition-transform hover:scale-105 disabled:opacity-60"
              >
                <Edit3 size={14} />
              </button>
            </>
          )}
        </div>

        <div className="mt-4 min-w-0">
          <p className="truncate font-display text-xl leading-tight">{profileName}</p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--color-lavender)]">
            {profileSubtitle}
          </p>
        </div>

        {!!streakDays && streakDays > 0 && (
          <div className="mt-4 flex justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--color-lime)] px-3 py-1 text-xs font-semibold text-[var(--color-navy)]">
              <Zap size={13} fill="currentColor" />
              {streakDays} {streakDays === 1 ? "día" : "días"}
            </span>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <div key={it.href}>
              {it.groupStart && <div className="my-2 h-px bg-white/10" />}
              <Link
                href={it.href}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-token)] px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[var(--color-lime)] font-medium text-[var(--color-navy)]"
                    : "text-white/80 hover:bg-white/10",
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

      <div className="px-5 pb-3">
        <div className="flex justify-center py-2">
          <Image
            src="/brand/logo-negativo.png"
            alt="EQUIdata"
            width={112}
            height={37}
            className="opacity-80"
          />
        </div>
      </div>

      <div className="border-t border-white/10 p-2" />
    </aside>
  );
}
