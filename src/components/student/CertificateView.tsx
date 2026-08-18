"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Certificado visual (spec §5.6) — diseño importado de Claude Design
 * ("Certificado EQUIdata", formato Horizontal, acento coral).
 *
 * Es la vista en pantalla (se reutiliza en la página del certificado, la
 * mini-preview de la pestaña de certificaciones y la verificación pública).
 * Se dibuja a tamaño de diseño fijo (1600×900) dentro de un nodo marcado con
 * `data-cert-canvas`, y se escala al ancho del contenedor con un transform
 * medido por ResizeObserver. Los colores van inline (hex del diseño, no
 * tokens) para que coincida exactamente con la referencia.
 *
 * La descarga (PNG) NO captura este DOM: se dibuja aparte, de forma nativa en
 * un `<canvas>`, con las mismas coordenadas — ver
 * `src/lib/student/certificateImage.ts`.
 */

const W = 1600;
const H = 900;
const NAVY = "#12224F";
const LIME = "#A9DB4E";
const PURPLE = "#8C6FE0";
const INK_SOFT = "#4B5563";
const GRAY = "#6B7280";
const HAIRLINE = "#DEDEE6";
const HINT = "#9CA3AF";

function formatDuration(min: number): string {
  const hours = Math.round((min / 60) * 10) / 10;
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

export function CertificateView({
  studentName,
  courseTitle,
  courseDescription,
  durationMin,
  issuedDateIso,
  code,
  accent = "#F1573D",
}: {
  studentName: string;
  courseTitle: string;
  courseDescription: string;
  durationMin: number;
  issuedDateIso: string;
  code: string;
  accent?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const issuedLabel = new Date(issuedDateIso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const monoLabel = (color: string): React.CSSProperties => ({
    fontFamily: "var(--font-mono), monospace",
    fontSize: 11,
    letterSpacing: "0.16em",
    color,
    fontWeight: 700,
  });

  const corner = (colors: [string, string, string, string]) => (
    <div
      style={{
        width: 280,
        height: 280,
        borderRadius: 34,
        overflow: "hidden",
        transform: "rotate(-12deg)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      }}
    >
      <div style={{ background: colors[0], clipPath: "polygon(0 0,100% 0,0 100%)" }} />
      <div style={{ background: colors[1], clipPath: "polygon(0 0,100% 0,100% 100%)" }} />
      <div style={{ background: colors[2], clipPath: "polygon(0 0,0 100%,100% 100%)" }} />
      <div style={{ background: colors[3], clipPath: "polygon(100% 0,100% 100%,0 100%)" }} />
    </div>
  );

  return (
    <div ref={outerRef} style={{ position: "relative", width: "100%", height: H * scale }}>
      <div
        data-cert-canvas
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          borderRadius: 40,
          background: "#FAFAF8",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(18,34,79,0.18)",
          boxSizing: "border-box",
          fontFamily: "var(--font-sans), sans-serif",
        }}
      >
        {/* Esquinas geométricas */}
        <div style={{ position: "absolute", left: -88, top: -88 }}>
          {corner([NAVY, accent, LIME, PURPLE])}
        </div>
        <div style={{ position: "absolute", right: -88, bottom: -88 }}>
          {corner([PURPLE, LIME, accent, NAVY])}
        </div>

        {/* Contenido */}
        <div
          style={{
            position: "absolute",
            left: 150,
            right: 150,
            top: 78,
            bottom: 70,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: -38,
              fontFamily: "var(--font-mono), monospace",
              fontSize: 12,
              color: HINT,
              textAlign: "left",
            }}
          >
            Verifica este certificado en{" "}
            <span style={{ color: HINT, textDecoration: "underline" }}>
              {origin}/verify/{code}
            </span>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-positivo.png"
            alt="EQUIdata"
            style={{ height: 125, width: 267, objectFit: "contain" }}
          />

          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.24em",
              color: accent,
              marginTop: 18,
            }}
          >
            CERTIFICADO DE FINALIZACIÓN
          </div>
          <div style={{ marginTop: 26, fontSize: 17, color: GRAY }}>
            Este certificado reconoce que
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: "var(--font-display), sans-serif",
              fontSize: 88,
              lineHeight: 1,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: "-0.02em",
            }}
          >
            {studentName}
          </div>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ marginTop: 8, width: 132, height: 10, borderRadius: 5, background: accent }} />
            <div style={{ marginTop: 22, fontSize: 17, color: GRAY }}>completó el curso</div>
            <div
              style={{
                marginTop: 8,
                fontFamily: "var(--font-display), sans-serif",
                fontSize: 40,
                lineHeight: 1.15,
                fontWeight: 700,
                color: NAVY,
                maxWidth: 900,
              }}
            >
              {courseTitle}
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 17,
                lineHeight: 1.6,
                color: INK_SOFT,
                maxWidth: 700,
                textWrap: "pretty",
              }}
            >
              {courseDescription}
            </div>
          </div>

          {/* Pie: métricas */}
          <div
            style={{
              marginTop: "auto",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
            }}
          >
            <div style={{ width: "100%", height: 1, background: HAIRLINE }} />
            <div style={{ display: "flex", gap: 56, textAlign: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={monoLabel(accent)}>EMITIDO EL</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: NAVY }}>{issuedLabel}</div>
              </div>
              <div style={{ width: 1, background: HAIRLINE }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={monoLabel(accent)}>DURACIÓN</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: NAVY }}>
                  {formatDuration(durationMin)}
                </div>
              </div>
              <div style={{ width: 1, background: HAIRLINE }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={monoLabel(accent)}>ID CERTIFICADO</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: NAVY }}>{code}</div>
              </div>
            </div>
          </div>

          {/* Sello + respaldo WWB */}
          <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 44 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/sello-originalidad.png"
              alt="Sello de originalidad"
              style={{ height: 96, width: 96, objectFit: "contain", flexShrink: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 9 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/wwb-monocromatico.png"
                alt="Fundación WWB Colombia"
                style={{ height: 91, width: 137, objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
