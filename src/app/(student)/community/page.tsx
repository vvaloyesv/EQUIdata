"use client";

import { Label } from "@/components/ui/Label";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="grid gap-8 rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-white px-7 py-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
        <div>
          <Label>Panel de aprendizaje</Label>
          <h1 className="mt-3 font-display text-4xl text-[var(--color-navy)]">
            Comunidad
          </h1>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
          Un jardín de ideas para compartir preguntas, hallazgos y pequeñas
          victorias del proceso. Lee, responde y deja una nota para que otras
          personas también puedan crecer con lo que estás aprendiendo.
        </p>
      </header>

      <div className="mt-8">
        <CommunityFeed />
      </div>
    </div>
  );
}
