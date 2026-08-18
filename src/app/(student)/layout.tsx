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
import { ProfileCompletionModal } from "@/components/student/ProfileCompletionModal";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { getStreakDays } from "@/lib/student/dashboard";
import { getUnreadMessageCount } from "@/lib/student/messages";
import { isProfileIncomplete } from "@/lib/student/profileCompletion";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseMode } from "@/lib/data/dataSource";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/student/imageCompression";

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
  const { refreshUser } = useAuth();
  const [messageBadgeKey, setMessageBadgeKey] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const { data: profile, loading: profileLoading } = useAsync(
    () =>
      user
        ? getRepository().getStudentProfile(user.id)
        : Promise.resolve(null),
    [user?.id, profileReloadKey],
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

  async function handleAvatarChange(file: File) {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);

      let url: string;
      if (isSupabaseMode()) {
        const supabase = createClient();
        const path = `${user.id}/avatar.jpg`;
        const { error } = await supabase.storage
          .from("avatars")
          .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
        if (error) throw error;
        // Cache-bust: el nombre de archivo no cambia entre subidas, así que
        // sin esto el navegador podría seguir mostrando la foto vieja.
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        url = `${data.publicUrl}?v=${Date.now()}`;
      } else {
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressed);
        });
      }

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
          onComplete={() => setProfileReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
