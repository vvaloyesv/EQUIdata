"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  BookOpen,
  Target,
  PlayCircle,
  Users,
  Award,
} from "lucide-react";
import { SidebarNav, type NavItem } from "@/components/ui/SidebarNav";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { getStreakDays } from "@/lib/student/dashboard";
import { getUnreadMessageCount } from "@/lib/student/messages";
import { useRequireAuth } from "@/lib/useRequireAuth";

const BASE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/courses", label: "Mis cursos", icon: BookOpen },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/community", label: "Comunidad", icon: Users },
  { href: "/messages", label: "Mensajes", icon: MessageSquare },
  { href: "/challenges", label: "Retos", icon: Target, groupStart: true },
  { href: "/tutorials", label: "Tutoriales", icon: PlayCircle },
  { href: "/certifications", label: "Certificaciones", icon: Award, groupStart: true },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth("student");
  const [messageBadgeKey, setMessageBadgeKey] = useState(0);
  const { data: profile } = useAsync(
    () =>
      user
        ? getRepository().getStudentProfile(user.id)
        : Promise.resolve(null),
    [user?.id],
  );
  const { data: streakDays } = useAsync(
    () =>
      user
        ? getStreakDays(getRepository(), user.id, new Date().toISOString())
        : Promise.resolve(0),
    [user?.id],
  );
  const { data: unreadCount } = useAsync(
    () =>
      user ? getUnreadMessageCount(getRepository(), user.id) : Promise.resolve(0),
    [user?.id, messageBadgeKey],
  );

  useEffect(() => {
    function refreshMessageBadge() {
      setMessageBadgeKey((k) => k + 1);
    }

    window.addEventListener("equidata:messages-read", refreshMessageBadge);
    return () =>
      window.removeEventListener("equidata:messages-read", refreshMessageBadge);
  }, []);

  const subtitle = profile ? profile.cargo : "Estudiante";
  const profileName = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : (user?.displayName ?? "Estudiante");

  const showUnreadBadge =
    profile?.notifyUnreadMessages !== false && !!unreadCount && unreadCount > 0;
  const items = BASE_ITEMS.map((it) =>
    it.href === "/messages" && showUnreadBadge
      ? { ...it, badge: unreadCount }
      : it,
  );

  if (loading || !user) {
    return <BrandLoader fullScreen size="lg" label="Abriendo tu ruta..." />;
  }

  return (
    <div className="flex">
      <SidebarNav
        items={items}
        profileName={profileName}
        profileSubtitle={subtitle}
        streakDays={streakDays ?? undefined}
      />
      <main className="h-dvh flex-1 overflow-y-auto bg-[var(--color-canvas)]">
        {children}
      </main>
    </div>
  );
}
