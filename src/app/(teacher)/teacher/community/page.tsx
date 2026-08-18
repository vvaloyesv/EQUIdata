"use client";

import { Label } from "@/components/ui/Label";
import { CommunityFeed } from "@/components/community/CommunityFeed";

export default function TeacherCommunityPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Label>Panel del profesor</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Comunidad
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Lo que publican tus estudiantes — dale like o responde directamente.
      </p>

      <div className="mt-6">
        <CommunityFeed />
      </div>
    </div>
  );
}
