"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { HtmlLayout } from "@/lib/htmlLayout";

/**
 * Script inyectado al final del HTML de autor (modos "page" y "fragment"):
 * reporta al padre el alto real del contenido y si se desborda a lo ancho.
 * Necesario porque el iframe va en sandbox sin "allow-same-origin" (origen
 * opaco) — el padre no puede medirlo directamente.
 */
const MEASURE_SCRIPT = `
<script>
(function () {
  function send() {
    var de = document.documentElement;
    // body.getBoundingClientRect() da el alto real del contenido; el
    // scrollHeight del documento nunca baja del alto del iframe.
    var h = document.body ? Math.ceil(document.body.getBoundingClientRect().height) : 0;
    parent.postMessage({
      type: "equidata-measure",
      height: h,
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth
    }, "*");
  }
  // La primera medición puede llegar antes de que el layout (y las fuentes)
  // se asienten: se repite al inicio, además de observar cambios.
  [0, 50, 150, 400, 900, 1600].forEach(function (ms) { setTimeout(send, ms); });
  window.addEventListener("load", send);
  if (window.ResizeObserver) new ResizeObserver(send).observe(document.documentElement);
  else setInterval(send, 500);
})();
</script>
`;

function withMeasure(html: string): string {
  return html.includes("</body>")
    ? html.replace("</body>", `${MEASURE_SCRIPT}</body>`)
    : html + MEASURE_SCRIPT;
}

const MIN_FRAGMENT_HEIGHT = 180;
/** Un recurso corto que crece más que esto ya es una página. */
const MAX_FRAGMENT_HEIGHT = 1600;
const DEFAULT_FRAGMENT_HEIGHT = 320;
/** Más allá de esto no es un diseño de escritorio que no cabe, es un error del HTML: no se reescala. */
const MAX_VIRTUAL_WIDTH = 2400;
/**
 * Alto disponible: la pantalla menos la barra superior, el encabezado de la
 * tarjeta y el botón de completar — "presentación" y "página" siempre caben
 * sin obligar a desplazar la página entera.
 */
const VIEWPORT_BOX = "100dvh - 250px";

export interface HtmlEmbedHandle {
  requestFullscreen: () => void;
}

/**
 * Cuadro de un módulo HTML de autor, según su tipo (`detectHtmlLayout`):
 * - "slides": 16:9 que cabe en la pantalla; el propio HTML se escala dentro.
 * - "page": alto de la pantalla, con scroll propio.
 * - "fragment": alto de su contenido.
 *
 * Ajuste de ancho (páginas y fragmentos): si el HTML se desborda a lo ancho
 * (un diseño pensado solo para pantallas anchas), se muestra al ancho que
 * necesita y se reduce de escala para que quepa completo, en vez de cortarse.
 * El HTML que ya se adapta al ancho no se toca.
 *
 * Sandbox "allow-scripts": el JS interactivo del autor corre, pero en un
 * origen opaco, sin acceso a la sesión ni a los datos de la app (spec §6).
 */
export const HtmlEmbed = forwardRef<
  HtmlEmbedHandle,
  { moduleId: string; title: string; html: string; layout: HtmlLayout }
>(function HtmlEmbed({ moduleId, title, html, layout }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [fragmentHeight, setFragmentHeight] = useState(DEFAULT_FRAGMENT_HEIGHT);
  const [virtualWidth, setVirtualWidth] = useState<number | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);

  useImperativeHandle(ref, () => ({
    requestFullscreen: () => void iframeRef.current?.requestFullscreen?.(),
  }));

  // Ancho real disponible, para calcular la escala al cambiar la ventana.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFragmentHeight(DEFAULT_FRAGMENT_HEIGHT);
    setVirtualWidth(null);
    if (layout === "slides") return;

    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow || e.data?.type !== "equidata-measure") return;
      const { height, scrollWidth, clientWidth } = e.data as {
        height: number;
        scrollWidth: number;
        clientWidth: number;
      };
      if (layout === "fragment" && height > 0) {
        setFragmentHeight(Math.min(Math.max(height, MIN_FRAGMENT_HEIGHT), MAX_FRAGMENT_HEIGHT));
      }
      // Solo crece: con el ancho nuevo el desborde puede seguir (hay diseños
      // que ocupan más cuanto más ancho tienen) y se vuelve a ampliar hasta
      // que cabe; nunca se achica en un vaivén.
      if (scrollWidth > clientWidth + 2 && scrollWidth <= MAX_VIRTUAL_WIDTH) {
        setVirtualWidth((prev) => Math.max(prev ?? 0, Math.ceil(scrollWidth)));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [moduleId, layout]);

  const scale =
    layout !== "slides" && virtualWidth && boxWidth > 0 && boxWidth < virtualWidth
      ? boxWidth / virtualWidth
      : 1;
  const scaled = scale < 1;

  // El transform no cambia el espacio que ocupa el iframe: el contenedor
  // lleva el alto ya escalado y el iframe el alto sin escalar.
  const boxHeight =
    layout === "page"
      ? `max(480px, calc(${VIEWPORT_BOX}))`
      : layout === "fragment"
        ? `${Math.round(fragmentHeight * scale)}px`
        : undefined;
  const iframeHeight =
    layout === "page"
      ? `calc(max(480px, calc(${VIEWPORT_BOX})) / ${scale})`
      : layout === "fragment"
        ? `${fragmentHeight}px`
        : undefined;

  return (
    <div
      ref={boxRef}
      className={cn("relative w-full overflow-hidden", layout === "slides" && "aspect-video")}
      style={{ height: boxHeight }}
    >
      <iframe
        key={moduleId}
        ref={iframeRef}
        srcDoc={layout === "slides" ? html : withMeasure(html)}
        title={title}
        style={{
          height: layout === "slides" ? "100%" : iframeHeight,
          width: scaled ? `${virtualWidth}px` : "100%",
          transform: scaled ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
        className={cn(
          "absolute left-0 top-0 block bg-white",
          layout === "fragment" && !scaled && "transition-[height] duration-150",
        )}
        sandbox="allow-scripts"
        allow="fullscreen"
        allowFullScreen
      />
    </div>
  );
});
