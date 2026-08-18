"use client";

import { use, useState, useEffect } from "react";
import { ShieldCheck, Download } from "lucide-react";
import { getRepository } from "@/lib/data";
import { downloadCertificateImage } from "@/lib/student/certificateImage";
import { CertificateView } from "@/components/student/CertificateView";
import { Logo } from "@/components/ui/Logo";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Certificate } from "@/lib/domain/types";

/**
 * Verificación pública de un certificado (spec §5.6). Ruta abierta — sin
 * useRequireAuth, cualquiera con el enlace puede abrirla. Busca el certificado
 * por su código y muestra sus datos + el bloque de verificación.
 *
 * Limitación del MVP: los certificados viven en memoria; los emitidos en
 * runtime se pierden al recargar. El sembrado (EQUI-2026-WWB01) siempre
 * resuelve. Con Supabase esto se vuelve una verificación real y persistente.
 */
export default function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [cert, setCert] = useState<Certificate | null | undefined>(undefined);
  const [origin, setOrigin] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    getRepository()
      .getCertificateByCode(code)
      .then((c) => setCert(c));
  }, [code]);

  async function downloadImage() {
    if (!cert) return;
    setGenerating(true);

    try {
      await downloadCertificateImage(cert);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--color-canvas)]">

      {/* Cabecera pública */}
      <header className="flex items-center justify-between border-b border-[var(--color-divider)] bg-white px-6 py-4">
        <Logo variant="color" width={130} />

        <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-lime-text)]">
          <ShieldCheck size={16} />
          Verificación pública
        </span>
      </header>

      {/* Contenedor general */}
      <div className="mx-auto max-w-7xl px-6 py-10">

        {cert === undefined ? (

          <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />

        ) : cert === null ? (

          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-divider)] bg-white px-6 py-12 text-center">
            <Label>Certificado no encontrado</Label>

            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--color-muted)]">
              No encontramos un certificado con el código{" "}
              <span className="font-mono text-[var(--color-navy)]">
                {code}
              </span>
              . Verifica que el enlace esté completo. (En esta versión de
              demostración los datos viven en memoria: un certificado emitido
              en otra sesión puede no estar disponible aquí.)
            </p>
          </div>

        ) : (

          <div className="space-y-8">

            {/* Encabezado */}
            <div className="text-center">
              <Badge tone="lime" className="mb-4">
                <ShieldCheck size={12} />
                Verificado por EQUIdata
              </Badge>
            </div>

            {/* Certificado — MÁS PEQUEÑO */}
<div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-divider)]">
  <CertificateView
    studentName={cert.studentName}
    courseTitle={cert.courseTitle}
    courseDescription={cert.courseDescription}
    durationMin={cert.durationMin}
    issuedDateIso={cert.issuedAt}
    code={cert.code}
  />
</div>

            {/* Botón de descarga */}
            <div className="flex justify-center">
              <Button onClick={downloadImage} disabled={generating}>
                <Download size={15} />
                {generating ? "Generando…" : "Descargar imagen"}
              </Button>
            </div>

            {/* Detalles de verificación — MÁS ANCHO */}
            <div className="mx-auto w-full max-w-7xl rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-white p-6">

              <h2 className="mt-1.5 font-display text-xl text-[var(--color-navy)]">
                Detalles de verificación
              </h2>

              {/* Información en 4 columnas */}
              <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

                {/* Otorgado a */}
                <div>
                  <Label>Otorgado a</Label>

                  <p className="mt-1 text-sm text-[var(--color-navy)]">
                    {cert.studentName}
                  </p>
                </div>

                {/* Curso */}
                <div>
                  <Label>Curso</Label>

                  <p className="mt-1 text-sm text-[var(--color-navy)]">
                    {cert.courseTitle}
                  </p>
                </div>

                {/* Emitido */}
                <div>
                  <Label>Emitido</Label>

                  <p className="mt-1 text-sm text-[var(--color-navy)]">
                    {new Date(cert.issuedAt).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                </div>

                {/* Código de verificación */}
                <div>
                  <Label>Código de verificación</Label>

                  <p className="mt-1 font-mono text-sm text-[var(--color-navy)]">
                    {cert.code}
                  </p>
                </div>

              </div>

              {/* Enlace de verificación */}
              <p className="mt-5 border-t border-[var(--color-divider)] pt-4 text-center text-xs text-[var(--color-hint)]">
                Este certificado puede verificarse en cualquier momento usando
                este enlace.
                <br />

                <span className="font-mono">
                  {origin}/verify/{cert.code}
                </span>
              </p>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
