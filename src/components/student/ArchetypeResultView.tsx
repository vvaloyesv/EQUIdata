import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import type { Archetype } from "@/lib/domain/types";

/**
 * Resultado del onboarding de intereses: no es una nota, es un arquetipo
 * (spec M8 §5) — "Eres un/a {name}".
 */
export function ArchetypeResultView({ archetype }: { archetype: Archetype }) {
  return (
    <Card dark className="text-center">
      <Sparkles size={22} className="mx-auto text-[var(--color-lavender)]" />
      <Label className="mt-2 !text-white/60">Tu arquetipo en este curso</Label>
      <div className="mt-2 font-display text-3xl text-white">
        Eres un/a {archetype.name}
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
        {archetype.description}
      </p>
    </Card>
  );
}
