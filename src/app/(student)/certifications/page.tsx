"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRepoQuery } from "@/lib/query";
import { getRepository } from "@/lib/data";
import { syncAndListCertificates } from "@/lib/student/certificate";
import { CertificateView } from "@/components/student/CertificateView";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/LockedState";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { queryKeys } from "@/lib/query";
import { buildDashboard } from "@/lib/student/dashboard";

/** Ancho del thumbnail; CertificateView se auto-escala a este ancho. */
const CARD_WIDTH = 340;

export default function CertificationsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { data: certificates, loading } = useRepoQuery(
    ["certificates", userId],
    () => syncAndListCertificates(getRepository(), userId, new Date().toISOString()),
    { enabled: !!user },
  );
  // Misma lectura que el dashboard (misma clave): para decir qué falta en cada curso.
  const { data: dash } = useRepoQuery(
    queryKeys.dashboard(userId),
    () => buildDashboard(getRepository(), userId, user?.displayName ?? "", new Date().toISOString()),
    { enabled: !!user },
  );

  if (loading || !certificates) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const certified = new Set(certificates.map((c) => c.courseId));
  const pending = (dash?.courses ?? []).filter((c) => !certified.has(c.course.id));

  return (
    <div>
      <PageHeader
        eyebrow={`${certificates.length} de ${certificates.length + pending.length} ${
          certificates.length + pending.length === 1 ? "certificado" : "certificados"
        }`}
        title="Certificaciones"
        description="Se obtienen al completar el curso y aprobar su diagnóstico final."
      />
      <PageBody>
        {certificates.length === 0 && pending.length === 0 ? (
          <EmptyState
            title="Aún no tienes certificados."
            hint="Inscríbete en un curso para empezar tu ruta hacia el primero."
            action={
              <Link href="/courses" className="text-sm text-[var(--color-lavender-text)] hover:underline">
                Ver cursos disponibles
              </Link>
            }
          />
        ) : certificates.length === 0 ? (
          <div className="space-y-3">
            {pending.map((c) => (
              <EmptyState
                key={c.course.id}
                eyebrow={`${c.completedModules}/${c.totalModules} módulos · ${c.percent}%`}
                title={c.course.title}
                hint={
                  c.percent < 100
                    ? `Te faltan ${c.totalModules - c.completedModules} módulos y el diagnóstico final.`
                    : c.hasFinalDiagnostic
                      ? "Contenido completo. Falta aprobar el diagnóstico final."
                      : "Contenido completo. Este curso todavía no tiene diagnóstico final: tu profesora debe activarlo."
                }
                action={
                  <Link href={`/courses/${c.course.id}`} className="text-sm text-[var(--color-lavender-text)] hover:underline">
                    Ir al curso
                  </Link>
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {certificates.map((cert) => (
              <div key={cert.code} style={{ width: CARD_WIDTH }}>
                <Link
                  href={`/courses/${cert.courseId}/certificate?from=certifications`}
                  className="block overflow-hidden rounded-[var(--radius-token)] transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(25,41,98,0.25)]"
                >
                  <div className="pointer-events-none">
                    <CertificateView
                      studentName={cert.studentName}
                      courseTitle={cert.courseTitle}
                      courseDescription={cert.courseDescription}
                      durationMin={cert.durationMin}
                      issuedDateIso={cert.issuedAt}
                      code={cert.code}
                    />
                  </div>
                </Link>
                <p className="mt-3 font-medium text-[var(--color-navy)]">
                  {cert.courseTitle}
                </p>
                <Link
                  href={`/courses/${cert.courseId}/certificate?from=certifications`}
                  className="mt-1 inline-block text-sm text-[var(--color-lavender-text)] hover:underline"
                >
                  Ver certificado →
                </Link>
                <div className="mt-1">
                  <Label>
                    EQUIdata ·{" "}
                    {new Date(cert.issuedAt).toLocaleDateString("es-CO", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </Label>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}
