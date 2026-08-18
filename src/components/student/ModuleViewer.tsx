"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { toEmbedVideoUrl } from "@/lib/video";
import type { Module } from "@/lib/domain/types";

/**
 * Script inyectado al final del HTML de autor: mide la altura real del
 * contenido y se la reporta al padre por postMessage. Necesario porque el
 * iframe va en sandbox sin "allow-same-origin" (origen opaco) — el padre no
 * puede leer su scrollHeight directamente.
 */
const AUTO_RESIZE_SCRIPT = `
<script>
(function () {
  function send() {
    // OJO: document.documentElement.scrollHeight tiene un "piso" en el alto
    // actual del viewport del iframe (nunca reporta menos), así que con
    // contenido corto queda pegado al alto por defecto. body.getBoundingClientRect()
    // sí refleja el alto real del contenido, sin ese piso.
    var h = document.body
      ? Math.ceil(document.body.getBoundingClientRect().height)
      : 0;
    if (h > 0) parent.postMessage({ type: "equidata-resize", height: h }, "*");
  }
  // Una sola medición (al cargar o por ResizeObserver) puede llegar antes de
  // que el layout termine de asentarse y reportar 0 — se reintenta varias
  // veces al inicio como respaldo, además de observar cambios posteriores.
  [0, 50, 150, 400, 900].forEach(function (ms) { setTimeout(send, ms); });
  window.addEventListener("load", send);
  if (window.ResizeObserver) {
    new ResizeObserver(send).observe(document.documentElement);
  } else {
    setInterval(send, 500);
  }
})();
</script>
`;

function withAutoResize(html: string): string {
  if (html.includes("</body>")) {
    return html.replace("</body>", `${AUTO_RESIZE_SCRIPT}</body>`);
  }
  return html + AUTO_RESIZE_SCRIPT;
}

const MIN_HTML_HEIGHT = 180;
const MAX_HTML_HEIGHT = 820;
const DEFAULT_HTML_HEIGHT = 320;

/**
 * Contenido del módulo activo: video embebido o HTML embebido y aislado.
 * El HTML se ajusta a la altura real de su contenido (ni espacio en blanco
 * de sobra, ni recorte de contenido largo) en vez de una altura fija.
 *
 * El HTML de autor lo escribe el profesor (contenido de confianza, no de
 * terceros) — se renderiza en un iframe con sandbox="allow-scripts" para que
 * corra su JS interactivo pero quede en un origen opaco, sin acceso a la
 * sesión ni a los datos de la página (aislamiento por robustez, no por
 * desconfianza del autor — spec §6).
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlHeight, setHtmlHeight] = useState(DEFAULT_HTML_HEIGHT);

  useEffect(() => {
    setHtmlHeight(DEFAULT_HTML_HEIGHT);

    function onMessage(e: MessageEvent) {
      if (
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === "equidata-resize"
      ) {
        const h = Math.min(
          Math.max(Number(e.data.height) || DEFAULT_HTML_HEIGHT, MIN_HTML_HEIGHT),
          MAX_HTML_HEIGHT,
        );
        setHtmlHeight(h);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [module.id]);

  return (
    <Card bordered>
      <div className="mb-4 flex items-center justify-between">
        <Label>
          {module.type === "video" ? "Video embebido" : "HTML embebido"} ·{" "}
          {module.durationMin ?? 10} min
        </Label>
        {completed && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-lime-text)]">
            <Check size={14} /> Completado
          </span>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-black",
          // El video mantiene 16:9; en pantallas anchas eso puede crecer más
          // alto que el viewport. Se limita el ancho según el alto disponible
          // (100vh menos el resto del chrome de la página) para que nunca
          // obligue a hacer scroll vertical.
          module.type === "video" &&
            "mx-auto max-w-[calc((100vh-190px)*16/9)]",
        )}
      >
        {module.type === "video" ? (
          <iframe
            key={module.id}
            src={module.videoUrl ? toEmbedVideoUrl(module.videoUrl) : module.videoUrl}
            title={module.title}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <iframe
            key={module.id}
            ref={iframeRef}
            srcDoc={withAutoResize(module.contentHtml ?? "")}
            title={module.title}
            style={{ height: htmlHeight }}
            className="w-full bg-white transition-[height] duration-150"
            sandbox="allow-scripts"
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
