"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import type { Challenge } from "@/lib/domain/types";

/**
 * Mismo script de auto-resize que ModuleViewer (ver ese archivo para el
 * porqué) — el HTML de un reto también puede tener alto variable.
 */
const AUTO_RESIZE_SCRIPT = `
<script>
(function () {
  function send() {
    var h = document.body
      ? Math.ceil(document.body.getBoundingClientRect().height)
      : 0;
    if (h > 0) parent.postMessage({ type: "equidata-resize", height: h }, "*");
  }
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

const MIN_HTML_HEIGHT = 220;
const MAX_HTML_HEIGHT = 820;
const DEFAULT_HTML_HEIGHT = 380;

/**
 * Renderiza el HTML de autor de un reto, aislado en el mismo iframe
 * sandbox="allow-scripts" que ModuleViewer. A diferencia de un módulo, el
 * reto se autocalifica: cuando el HTML termina, hace
 * `parent.postMessage({ type: "equidata-reto-result", score, total }, "*")`
 * — ese es el contrato que debe seguir cualquier HTML de reto que escriba el
 * profesor. `onResult` se dispara una sola vez por intento; para reintentar,
 * el padre debe cambiar `attemptKey` (remonta el iframe con datos limpios).
 */
export function ChallengeViewer({
  challenge,
  attemptKey,
  onResult,
}: {
  challenge: Challenge;
  attemptKey: number;
  onResult: (score: number, total: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlHeight, setHtmlHeight] = useState(DEFAULT_HTML_HEIGHT);
  /** Ref, no state: la guarda de "un solo resultado por intento" es un efecto
   * secundario de la validación del mensaje, no debe vivir en un updater de
   * setState (React StrictMode invoca updaters dos veces en dev para
   * detectar impurezas — si el postMessage aquí adentro, se dispara doble). */
  const submittedRef = useRef(false);

  useEffect(() => {
    setHtmlHeight(DEFAULT_HTML_HEIGHT);
    submittedRef.current = false;

    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;

      if (e.data?.type === "equidata-resize") {
        const h = Math.min(
          Math.max(Number(e.data.height) || DEFAULT_HTML_HEIGHT, MIN_HTML_HEIGHT),
          MAX_HTML_HEIGHT,
        );
        setHtmlHeight(h);
        return;
      }

      if (e.data?.type === "equidata-reto-result") {
        if (submittedRef.current) return;
        const total = Number(e.data.total);
        const score = Number(e.data.score);
        if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(score)) return;
        const clampedScore = Math.max(0, Math.min(score, total));
        submittedRef.current = true;
        onResult(clampedScore, total);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [challenge.id, attemptKey, onResult]);

  return (
    <Card bordered>
      <div className="mb-4">
        <Label>Reto · {challenge.difficulty}</Label>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-token)] border border-[var(--color-divider)] bg-white">
        <iframe
          key={`${challenge.id}-${attemptKey}`}
          ref={iframeRef}
          srcDoc={withAutoResize(challenge.contentHtml)}
          title={challenge.title}
          style={{ height: htmlHeight }}
          className="w-full bg-white transition-[height] duration-150"
          sandbox="allow-scripts"
        />
      </div>
    </Card>
  );
}
