"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Maximize2, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { HtmlEmbed, type HtmlEmbedHandle } from "@/components/student/HtmlEmbed";
import { detectHtmlLayout } from "@/lib/htmlLayout";
import { toEmbedVideoUrl, youTubeIdOf, youTubePlayerUrl } from "@/lib/video";
import { getRepository } from "@/lib/data";
import { queryKeys } from "@/lib/query";
import type { Module } from "@/lib/domain/types";

/**
 * Lectura en caché del HTML de un módulo. Exportada para que la vista de
 * curso precargue el módulo siguiente con la misma clave. El contenido de
 * un módulo casi nunca cambia durante una clase: 10 minutos sin refetch.
 */
export function moduleContentQuery(moduleId: string) {
  return {
    queryKey: queryKeys.moduleContent(moduleId),
    queryFn: async () => (await getRepository().getModuleContent(moduleId))?.contentHtml ?? "",
    staleTime: 10 * 60_000,
  };
}

/**
 * HTML del módulo: las listas no lo traen (M10 · F4, puede pesar cientos de
 * KB), así que se pide aquí, solo para el módulo que se está viendo. Si el
 * módulo ya trae su HTML, se usa tal cual.
 */
function useModuleHtml(module: Module) {
  const needsFetch = module.type === "html" && module.contentHtml === undefined;
  const query = useQuery({ ...moduleContentQuery(module.id), enabled: needsFetch });
  if (!needsFetch) return { contentHtml: module.contentHtml, loadingContent: false };
  return { contentHtml: query.data, loadingContent: query.isPending };
}

/**
 * Video de YouTube en dos tiempos (M10 · F5): primero la miniatura (una
 * imagen de ~20 KB) con un botón de reproducir; el reproductor completo de
 * YouTube, que pesa bastante más, se carga solo al pulsarlo. Otros
 * proveedores se embeben directo, como antes.
 */
function VideoEmbed({ module }: { module: Module }) {
  const [playing, setPlaying] = useState(false);
  const videoUrl = module.videoUrl ?? "";
  const videoId = youTubeIdOf(videoUrl);

  useEffect(() => setPlaying(false), [module.id]);

  if (!videoId || playing) {
    return (
      <iframe
        key={module.id}
        src={videoId ? youTubePlayerUrl(videoId) : toEmbedVideoUrl(videoUrl)}
        title={module.title}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full"
      aria-label={`Reproducir: ${module.title}`}
    >
      {/* Conexiones anticipadas: el reproductor arranca más rápido al hacer clic. */}
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />
      <link rel="preconnect" href="https://i.ytimg.com" />
      {/* Miniatura remota de YouTube: next/image necesitaría configurar el dominio y no aporta aquí. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-navy)] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105">
          <Play size={26} className="ml-1" fill="currentColor" />
        </span>
      </span>
    </button>
  );
}

/**
 * Contenido del módulo activo: video embebido o HTML de autor aislado. El
 * cuadro del HTML depende de cómo está hecho (ver `HtmlEmbed` y
 * `detectHtmlLayout`); cualquier HTML se puede abrir en pantalla completa.
 */
export function ModuleViewer({
  module,
  completed,
  onComplete,
  primaryLabel = "Marcar como completado",
}: {
  module: Module;
  completed: boolean;
  onComplete: () => void;
  primaryLabel?: string;
}) {
  const embedRef = useRef<HtmlEmbedHandle>(null);
  const { contentHtml, loadingContent } = useModuleHtml(module);
  const isHtml = module.type === "html";
  const layout = useMemo(
    () => (contentHtml ? detectHtmlLayout(contentHtml) : "fragment"),
    [contentHtml],
  );

  return (
    <Card bordered>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Label>
          {module.type === "video" ? "Video embebido" : "HTML embebido"} ·{" "}
          {module.durationMin ?? 10} min
        </Label>
        <div className="flex items-center gap-4">
          {isHtml && !loadingContent && (
            <button
              type="button"
              onClick={() => embedRef.current?.requestFullscreen()}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-lavender-text)] hover:underline"
            >
              <Maximize2 size={13} /> Pantalla completa
            </button>
          )}
          {completed && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-lime-text)]">
              <Check size={14} /> Completado
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-black",
          // Video y presentación mantienen 16:9; en pantallas anchas eso
          // puede crecer más alto que la pantalla, así que el ancho se limita
          // según el alto disponible — nunca obligan a desplazar la página.
          module.type === "video" && "mx-auto max-w-[calc((100vh-190px)*16/9)]",
          isHtml && layout === "slides" && "mx-auto max-w-[calc((100dvh-250px)*16/9)]",
        )}
      >
        {module.type === "video" ? (
          <VideoEmbed module={module} />
        ) : loadingContent ? (
          <div className="flex h-80 items-center justify-center bg-white text-sm text-[var(--color-muted)]">
            Cargando el recurso…
          </div>
        ) : (
          <HtmlEmbed
            ref={embedRef}
            moduleId={module.id}
            title={module.title}
            html={contentHtml ?? ""}
            layout={layout}
          />
        )}
      </div>

      {!completed && (
        <div className="mt-4 flex justify-end">
          <Button onClick={onComplete}>{primaryLabel}</Button>
        </div>
      )}
    </Card>
  );
}
