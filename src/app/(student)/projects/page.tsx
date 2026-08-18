import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

/**
 * Fachada (spec §4.3): pantalla navegable con datos de ejemplo, sin modelo
 * ni lógica real todavía.
 */
const PROJECTS = [
  {
    id: "p1",
    title: "Brecha salarial por sede",
    category: "Género y desarrollo",
    description:
      "Análisis exploratorio de la brecha salarial reportada por las participantes de los programas de la Fundación, comparando por sede y antigüedad.",
    status: "Activo" as const,
    deadline: "20 de septiembre",
    members: ["Valentina Mendoza", "Juan Camilo", "Laura"],
  },
  {
    id: "p2",
    title: "Mapa de acceso a servicios",
    category: "Desarrollo territorial",
    description:
      "Visualización del acceso a servicios básicos en los territorios donde opera la Fundación, con datos de la última encuesta.",
    status: "Activo" as const,
    deadline: "5 de octubre",
    members: ["María Fernanda", "Ana María"],
  },
  {
    id: "p3",
    title: "Índice de autonomía económica",
    category: "Género y desarrollo",
    description:
      "Construcción de un índice compuesto para medir autonomía económica en beneficiarias del programa de emprendimiento.",
    status: "Completado" as const,
    deadline: "Cerrado",
    members: ["Laura", "Valentina Mendoza", "Juan Camilo", "Ana María"],
  },
];

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Label>Aprender construyendo</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Proyectos de comunidad
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">
        Aplica lo aprendido a análisis reales, en equipo con otras personas de
        la Fundación.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {PROJECTS.map((p) => (
          <Card key={p.id} bordered>
            <div className="flex items-start justify-between gap-3">
              <Badge tone="lavender">{p.category}</Badge>
              <Badge tone={p.status === "Activo" ? "lime" : "neutral"}>
                {p.status}
              </Badge>
            </div>
            <h3 className="mt-3 font-display text-lg text-[var(--color-navy)]">
              {p.title}
            </h3>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              {p.description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {p.members.slice(0, 4).map((m) => (
                  <Avatar
                    key={m}
                    name={m}
                    size={28}
                    className="border-2 border-white"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-hint)]">
                <Calendar size={13} /> {p.deadline}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
