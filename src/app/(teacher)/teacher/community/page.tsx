"use client";

import { CommunityFeed } from "@/components/community/CommunityFeed";
import { PageBody, PageHeader } from "@/components/ui/Page";

export default function TeacherCommunityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Preguntas · hallazgos · retos · celebraciones"
        title="Comunidad"
        description="Lo que publican tus estudiantes. Dale me gusta o responde directamente."
      />
      <PageBody>
      <div className="mt-6">
        <CommunityFeed />
      </div>
      </PageBody>
    </div>
  );
}
