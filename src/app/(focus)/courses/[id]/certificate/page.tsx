"use client";

import { Suspense, use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Copy, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/lib/useAsync";
import { getRepository } from "@/lib/data";
import { buildCourseView } from "@/lib/student/course";
import { getOrIssueCertificate } from "@/lib/student/certificate";
import { downloadCertificateImage } from "@/lib/student/certificateImage";
import { CertificateView } from "@/components/student/CertificateView";
import { FocusTopBar } from "@/components/student/FocusTopBar";
import { LockedState } from "@/components/ui/LockedState";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";

export default function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <CertificatePageInner params={params} />
    </Suspense>
  );
}

function CertificatePageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const fromCertifications = searchParams.get("from") === "certifications";
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, loading } = useAsync(async () => {
    if (!user) return null;
    const repo = getRepository();
    const nowIso = new Date().toISOString();
    const vm = await buildCourseView(repo, user.id, courseId, nowIso);
    const certificate = await getOrIssueCertificate(
      repo,
      user.id,
      courseId,
      nowIso,
    );
    return { vm, certificate };
  }, [user?.id, courseId]);

  if (loading || !data) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-divider)]" />
      </div>
    );
  }

  const { vm, certificate } = data;

  async function downloadImage() {
    if (!certificate) return;
    setGenerating(true);
    try {
      await downloadCertificateImage(certificate);
    } finally {
      setGenerating(false);
    }
  }

  async function copyVerifyLink() {
    if (!certificate) return;
    const url = `${window.location.origin}/verify/${certificate.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <FocusTopBar
        backHref={fromCertifications ? "/certifications" : `/courses/${courseId}`}
        backLabel={fromCertifications ? "Volver a certificaciones" : "Volver al curso"}
        crumbs={[vm.course.title, "Certificado"]}
      />

      <div className="mx-auto max-w-4xl px-8 py-8">
        {!certificate ? (
          <LockedState
            reason={
              vm.certificateReason ??
              "Todavía no cumples las condiciones para el certificado."
            }
          />
        ) : (
          <div className="space-y-6">
            <CertificateView
              studentName={certificate.studentName}
              courseTitle={certificate.courseTitle}
              courseDescription={certificate.courseDescription}
              durationMin={certificate.durationMin}
              issuedDateIso={certificate.issuedAt}
              code={certificate.code}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--color-divider)] bg-white p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-[var(--color-lime-text)]" />
                <div>
                  <Label>Código de verificación</Label>
                  <p className="font-mono text-sm text-[var(--color-navy)]">
                    {certificate.code}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={copyVerifyLink}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copiado" : "Copiar enlace de verificación"}
                </Button>
                <Button onClick={downloadImage} disabled={generating}>
                  {generating ? "Generando…" : "Descargar imagen"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
