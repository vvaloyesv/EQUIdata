"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { syncAndListCertificates } from "@/lib/student/certificate";
import { CertificateView } from "@/components/student/CertificateView";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/LockedState";

/** Ancho del thumbnail; CertificateView se auto-escala a este ancho. */
const CARD_WIDTH = 340;

export default function CertificationsPage() {
  const { user } = useAuth();
  const { data: certificates, loading } = useAsync(
    () =>
      user
        ? syncAndListCertificates(getRepository(), user.id, new Date().toISOString())
        : Promise.resolve(null),
    [user?.id],
  );

  if (loading || !certificates) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Label>Panel de aprendizaje</Label>
      <h1 className="mt-2 font-display text-3xl text-[var(--color-navy)]">
        Certificaciones
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Los certificados que obtienes al completar y aprobar el diagnóstico
        final de cada curso.
      </p>

      <div className="mt-6">
        {certificates.length === 0 ? (
          <EmptyState
            title="Aún no tienes certificados"
            hint="Completa un curso y aprueba su diagnóstico final para obtener tu primer certificado."
          />
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
      </div>
    </div>
  );
}
