"use client";

import { useState } from "react";
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
import { ProfileCompletionModal } from "@/components/student/ProfileCompletionModal";
import { queryKeys, useRefresh, useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { getStreakDays } from "@/lib/student/dashboard";
import { getUnreadMessageCount } from "@/lib/student/messages";
import { isProfileIncomplete } from "@/lib/student/profileCompletion";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/student/imageCompression";
import { features } from "@/lib/features";

const BASE_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/courses", label: "Mis cursos", icon: BookOpen },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  // Fachada: oculta en el piloto salvo NEXT_PUBLIC_SHOW_PROJECTS=true (src/lib/features.ts).
  ...(features.projects
    ? [{ href: "/projects", label: "Proyectos", icon: FolderKanban }]
    : []),
  { href: "/community", label: "Comunidad", icon: Users },
  // Oculto en el piloto salvo NEXT_PUBLIC_SHOW_MESSAGES=true (src/lib/features.ts).
  ...(features.messages ? [{ href: "/messages", label: "Mensajes", icon: MessageSquare }] : []),
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
  const { refreshUser } = useAuth();
  const refresh = useRefresh();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const userId = user?.id ?? "";
  // Perfil y no leídos comparten clave con el dashboard y Mensajes: una sola lectura.
  const { data: profile, loading: profileLoading } = useRepoQuery(
    queryKeys.studentProfile(userId),
    () => getRepository().getStudentProfile(userId),
    { enabled: !!user },
  );
  const { data: streakDays } = useRepoQuery(
    queryKeys.streak(userId),
    () => getStreakDays(getRepository(), userId, new Date().toISOString()),
    { enabled: !!user },
  );
  const { data: unreadCount } = useRepoQuery(
    queryKeys.unread(userId),
    () => getUnreadMessageCount(getRepository(), userId),
    { enabled: !!user && features.messages },
  );

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

  async function handleAvatarChange(file: File) {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);

      const supabase = createClient();
      const path = `${user.id}/avatar.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      // Cache-bust: el nombre de archivo no cambia entre subidas, así que
      // sin esto el navegador podría seguir mostrando la foto vieja.
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;

      await getRepository().updateAvatarUrl(user.id, url);
      await refreshUser();
    } finally {
      setAvatarUploading(false);
    }
  }

  if (loading || !user || profileLoading) {
    return <BrandLoader fullScreen size="lg" label="Abriendo tu ruta..." />;
  }

  return (
    <div className="flex">
      <SidebarNav
        items={items}
        profileName={profileName}
        profileSubtitle={subtitle}
        streakDays={streakDays ?? undefined}
        avatarUrl={user.avatarUrl}
        onAvatarChange={handleAvatarChange}
        avatarUploading={avatarUploading}
      />
      <main className="h-dvh flex-1 overflow-y-auto bg-[var(--color-canvas)]">
        {children}
      </main>
      {isProfileIncomplete(profile ?? null) && (
        <ProfileCompletionModal
          userId={user.id}
          profile={profile ?? null}
          onComplete={() => void refresh()}
        />
      )}
    </div>
  );
}
