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
import { SidebarNav, type NavItem } from "@/components/ui/SidebarNav";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { features } from "@/lib/features";

const items: NavItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/teacher/courses", label: "Cursos", icon: BookOpen },
  { href: "/teacher/tutorials", label: "Tutoriales", icon: PlayCircle },
  { href: "/teacher/challenges", label: "Retos", icon: Target },
  { href: "/teacher/students", label: "Estudiantes", icon: Users, groupStart: true },
  { href: "/teacher/grades", label: "Calificaciones", icon: ClipboardList },
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

  if (loading || !user) {
    return <BrandLoader fullScreen size="lg" label="Preparando el panel..." />;
  }

  return (
    <div className="flex">
      <SidebarNav
        items={items}
        profileName={user?.displayName ?? "Profesora"}
        profileSubtitle="Profesora"
      />
      <main className="h-dvh flex-1 overflow-y-auto bg-[var(--color-canvas)]">
        {children}
      </main>
    </div>
  );
}
