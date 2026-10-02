"use client";

import {
  LayoutGrid,
  BookOpen,
  PlayCircle,
  Target,
  Users,
  ClipboardList,
  TrendingUp,
  MessageSquare,
  MessageCircle,
  Settings,
} from "lucide-react";
import { AppFrame, SidebarNav, type NavItem } from "@/components/ui/SidebarNav";
import { useAuth } from "@/context/AuthContext";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { features } from "@/lib/features";

const items: NavItem[] = [
  { href: "/teacher/dashboard", label: "Inicio", icon: LayoutGrid, mobile: true },
  { href: "/teacher/courses", label: "Cursos", icon: BookOpen, mobile: true },
  { href: "/teacher/tutorials", label: "Tutoriales", icon: PlayCircle },
  { href: "/teacher/challenges", label: "Retos", icon: Target },
  { href: "/teacher/students", label: "Estudiantes", icon: Users, groupStart: true, mobile: true },
  { href: "/teacher/grades", label: "Calificaciones", icon: ClipboardList, mobile: true, mobileLabel: "Notas" },
  { href: "/teacher/progress", label: "Progreso", icon: TrendingUp },
  { href: "/teacher/community", label: "Comunidad", icon: MessageCircle, groupStart: true },
  // Oculto en el piloto salvo NEXT_PUBLIC_SHOW_MESSAGES=true (src/lib/features.ts).
  ...(features.messages
    ? [{ href: "/teacher/messages", label: "Mensajes", icon: MessageSquare }]
    : []),
  { href: "/teacher/settings", label: "Configuración", icon: Settings, groupStart: true },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth("teacher");
  const { logout } = useAuth();

  if (loading || !user) {
    return <BrandLoader fullScreen size="lg" label="Preparando el panel..." />;
  }

  return (
    <AppFrame
      nav={
        <SidebarNav
          items={items}
          profileName={user?.displayName ?? "Profesora"}
          profileSubtitle="Profesora"
          avatarUrl={user.avatarUrl}
          settingsHref="/teacher/settings"
          onLogout={() => {
            logout();
            window.location.href = "/login";
          }}
        />
      }
    >
      {children}
    </AppFrame>
  );
}
