"use client";

import { CommunityFeed } from "@/components/community/CommunityFeed";
import { PageBody, PageHeader } from "@/components/ui/Page";

export default function CommunityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Preguntas · hallazgos · retos · celebraciones"
        title="Comunidad"
        description="Comparte preguntas, hallazgos y avances de tu ruta. Lee, responde y deja una nota para que otras personas aprendan contigo."
      />
      <PageBody>
        <CommunityFeed />
      </PageBody>
    </div>
  );
}
