"use client";

import Link from "next/link";
import { Video, FileCode2 } from "lucide-react";
import { useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { PageBody, PageHeader } from "@/components/ui/Page";

/** Tutoriales rápidos: mini-módulos sueltos (spec §5.8) — reusan el tipo Module. */
export default function TutorialsPage() {
  const { data: tutorials, loading } = useRepoQuery(["tutorials"], () =>
    getRepository().listTutorials(),
  );

  if (loading || !tutorials) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const minutes = tutorials.reduce((a, t) => a + (t.durationMin ?? 10), 0);

  return (
    <div>
      <PageHeader
        eyebrow={`${tutorials.length} ${tutorials.length === 1 ? "tutorial" : "tutoriales"} · ${minutes} min en total`}
        title="Tutoriales"
        description="Módulos cortos e independientes, en video o HTML interactivo. Algunos traen un quiz corto."
      />
      <PageBody>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tutorials.map((t) => {
          const Icon = t.type === "video" ? Video : FileCode2;
          return (
            <Link key={t.id} href={`/tutorials/${t.id}`} className="block">
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
      </PageBody>
    </div>
  );
}
