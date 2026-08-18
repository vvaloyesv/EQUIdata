/**
 * Genera el certificado como imagen PNG dibujándolo directamente en un
 * `<canvas>` a coordenadas fijas (no es una captura del DOM). El diseño es un
 * molde: siempre queda idéntico y solo cambian los valores (nombre, curso,
 * descripción, duración, código, fecha).
 *
 * Se dibuja en un espacio de diseño de 1600×900 (las coordenadas del diseño de
 * Claude Design, "Certificado EQUIdata", formato Horizontal) y se escala al
 * lienzo de salida real (2400×1350) con `ctx.scale`, así no hay que tocar
 * ningún número si el tamaño de salida cambia.
 *
 * La página en sí queda rectangular (sin redondear) — lo que sí se redondea es
 * el cuadrado decorativo de cada esquina (igual que el `border-radius` +
 * `overflow:hidden` del diseño original), por eso la punta que se asoma en el
 * certificado termina en curva y no en pico.
 *
 * Se incrustan las fuentes de marca reales (Space Grotesk, Inter, Space Mono)
 * vía la Font Loading API para que el resultado se vea igual al diseño.
 */

import type { Certificate } from "@/lib/domain/types";
import {
  NAVY,
  LIME,
  PURPLE,
  CORAL,
  BG,
  GRAY,
  INK_SOFT,
  HAIRLINE,
  HINT,
  loadFonts,
  loadImage,
  roundRectPath,
  drawCornerDecoration,
  drawContain,
  fillTextTracked,
  wrapText,
} from "@/lib/student/brandCanvas";

const BASE_W = 1600;
const BASE_H = 900;
const OUT_W = 2400;
const OUT_H = 1350;
const SCALE = OUT_W / BASE_W;

function formatDuration(min: number): string {
  const hours = Math.round((min / 60) * 10) / 10;
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function downloadCertificateImage(cert: Certificate): Promise<void> {
  const [[logo, sello, wwb]] = await Promise.all([
    Promise.all([
      loadImage("/brand/logo-positivo.png"),
      loadImage("/brand/sello-originalidad.png"),
      loadImage("/brand/wwb-monocromatico.png"),
    ]),
    loadFonts(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo del certificado.");

  ctx.scale(SCALE, SCALE); // a partir de aquí, todo se dibuja en coordenadas de diseño 1600×900
  const CX = BASE_W / 2;
  ctx.textAlign = "center";

  // Fondo — sin recorte de página, es un rectángulo plano
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Esquinas geométricas: cuadrado 280, radio 34, rotado -12°
  drawCornerDecoration(ctx, -88 + 140, -88 + 140, 280, 34, -12, [NAVY, CORAL, LIME, PURPLE]);
  drawCornerDecoration(
    ctx,
    BASE_W - 192 + 140,
    BASE_H - 192 + 140,
    280,
    34,
    -12,
    [PURPLE, LIME, CORAL, NAVY],
  );

  // Logo EQUIdata
  drawContain(ctx, logo, CX - 267 / 2, 66, 267, 125);

  // CERTIFICADO DE FINALIZACIÓN
  ctx.font = "700 13px SpaceMono";
  ctx.fillStyle = CORAL;
  fillTextTracked(ctx, "CERTIFICADO DE FINALIZACIÓN", CX, 250, 13 * 0.24);

  // Este certificado reconoce que
  ctx.font = "400 16px Inter";
  ctx.fillStyle = GRAY;
  ctx.fillText("Este certificado reconoce que", CX, 292);

  // Nombre — Space Grotesk, con autoajuste si es muy largo
  let nameSize = 86;
  ctx.font = `700 ${nameSize}px SpaceGrotesk`;
  while (ctx.measureText(cert.studentName).width > 1280 && nameSize > 40) {
    nameSize -= 2;
    ctx.font = `700 ${nameSize}px SpaceGrotesk`;
  }
  ctx.fillStyle = NAVY;
  ctx.fillText(cert.studentName, CX, 376);

  // Barra acento
  ctx.fillStyle = CORAL;
  roundRectPath(ctx, CX - 66, 406, 132, 10, 5);
  ctx.fill();

  // completó el curso
  ctx.font = "400 16px Inter";
  ctx.fillStyle = GRAY;
  ctx.fillText("completó el curso", CX, 458);

  // Título del curso (envuelve si hace falta)
  ctx.font = "700 40px SpaceGrotesk";
  ctx.fillStyle = NAVY;
  const titleLines = wrapText(ctx, cert.courseTitle, 1150);
  let y = 504;
  for (const line of titleLines) {
    ctx.fillText(line, CX, y);
    y += 48;
  }

  // Descripción
  ctx.font = "400 16px Inter";
  ctx.fillStyle = INK_SOFT;
  const descLines = wrapText(ctx, cert.courseDescription, 900);
  y += 6;
  for (const line of descLines) {
    ctx.fillText(line, CX, y);
    y += 25;
  }

  // Métricas (ancladas cerca del pie, independientes del largo del contenido de arriba)
  const metricsY = 680;
  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(150, metricsY - 36, BASE_W - 300, 1);

  const cols: [string, string][] = [
    ["EMITIDO EL", formatDate(cert.issuedAt)],
    ["DURACIÓN", formatDuration(cert.durationMin)],
    ["ID CERTIFICADO", cert.code],
  ];
  const colCenters = [CX - 300, CX, CX + 300];
  cols.forEach(([label, value], i) => {
    const x = colCenters[i];
    ctx.font = "700 10px SpaceMono";
    ctx.fillStyle = CORAL;
    fillTextTracked(ctx, label, x, metricsY, 10 * 0.16);
    ctx.font = "600 16px Inter";
    ctx.fillStyle = NAVY;
    ctx.fillText(value, x, metricsY + 26);
    if (i < 2) {
      ctx.fillStyle = HAIRLINE;
      ctx.fillRect(x + 150, metricsY - 16, 1, 42);
    }
  });

  // Sello + respaldo WWB (más grandes, con aire respecto al link de abajo)
  const badgeY = metricsY + 56;
  const selloBox = 100;
  const wwbBoxW = 154;
  const wwbBoxH = 100;
  const gap = 38;
  const groupW = selloBox + gap + wwbBoxW;
  const groupX = CX - groupW / 2;
  drawContain(ctx, sello, groupX, badgeY, selloBox, selloBox);
  drawContain(ctx, wwb, groupX + selloBox + gap, badgeY, wwbBoxW, wwbBoxH);

  // Línea de verificación — el mismo enlace real que muestra /verify/[code],
  // no un dominio de ejemplo (el usuario debe poder copiarlo y que funcione).
  ctx.font = "400 12px SpaceMono";
  ctx.fillStyle = HINT;
  ctx.textAlign = "left";
  ctx.fillText(
    `Verifica este certificado en ${window.location.origin}/verify/${cert.code}`,
    150,
    BASE_H - 26,
  );

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("No se pudo generar la imagen del certificado.");

  const url = URL.createObjectURL(blob);
  const slug = cert.studentName.trim().toLowerCase().replace(/\s+/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificado-${slug}-${cert.courseId}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
