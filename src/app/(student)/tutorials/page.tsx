"use client";

import Link from "next/link";
import { Video, FileCode2 } from "lucide-react";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";

/** Tutoriales rápidos: mini-módulos sueltos (spec §5.8) — reusan el tipo Module. */
export default function TutorialsPage() {
  const { data: tutorials, loading } = useAsync(
    () => getRepository().listTutorials(),
    [],
  );

  if (loading || !tutorials) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Label>Aprendizaje rápido</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Tutoriales
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Mini módulos independientes — video o HTML interactivo, algunos con un quiz corto.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tutorials.map((t) => {
          const Icon = t.type === "video" ? Video : FileCode2;
          return (
            <Link key={t.id} href={`/tutorials/${t.id}`}>
              <Card bordered className="h-full transition-colors hover:border-[var(--color-lavender)]">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-[var(--color-lavender-text)]" />
                  <Label>
                    {t.type === "video" ? "Video" : "HTML"} · {t.durationMin ?? 10} min
                  </Label>
                </div>
                <h3 className="mt-2 font-display text-lg text-[var(--color-navy)]">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {t.description}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
