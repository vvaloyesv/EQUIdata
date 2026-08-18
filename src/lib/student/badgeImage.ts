/**
 * Insignia "Hago parte de EQUIdata" — reproduce fielmente el diseño de marca
 * (`Insignia EQUIdata.dc.html`, Claude Design): tarjeta vertical 660×824 sobre
 * fondo navy, con abanicos de triángulos, marco de foto con esquinas de color,
 * sello de originalidad, y pie con nombre + logo WWB. Mismo motor de dibujo en
 * `<canvas>` que el certificado (`brandCanvas.ts`).
 *
 * A diferencia del certificado, no depende de un curso: lleva el nombre de
 * quien la genera y, opcionalmente, su foto (subida por el usuario, nunca se
 * guarda en el repositorio — solo vive en memoria del navegador mientras se
 * genera la imagen).
 */

import {
  loadFonts,
  loadImage,
  drawCover,
  drawContain,
  fillTriangle,
} from "@/lib/student/brandCanvas";

// Lienzo de diseño (coincide con la tarjeta del .dc.html) y escala de salida.
const BASE_W = 660;
const BASE_H = 824;
const SCALE = 2;
const OUT_W = BASE_W * SCALE;
const OUT_H = BASE_H * SCALE;

// Paleta exacta del diseño (hexes de marca EQUIdata, no los del certificado).
const CARD = "#0E1A44"; // fondo de la tarjeta
const INNER = "#0a1330"; // fondo del marco de foto / borde exterior
const D_LIME = "#BBEF7F";
const D_PURPLE = "#BEA4E8";
const D_CORAL = "#D55947";
const D_DARK = "#2b3d75"; // triángulo de acento tenue

const COHORT_LABEL = "COHORTE 1";
const SUB_A = "8 SESIONES PARA APRENDER A ";
const SUB_B = "ANALIZAR DATOS";

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/** Devuelve un canvas con `img` recoloreada a `color` sólido (conserva el alfa). */
function recolor(img: HTMLImageElement, w: number, h: number, color: string): HTMLCanvasElement {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d")!;
  drawContain(octx, img, 0, 0, w, h);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = color;
  octx.fillRect(0, 0, w, h);
  return off;
}

/** Triángulo por tres vértices. */
function tri(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  color: string,
) {
  fillTriangle(ctx, ax, ay, bx, by, cx, cy, color);
}

/**
 * Dibuja la insignia completa en `ctx` (coordenadas de diseño 660×824).
 * Reusable por el preview en vivo y la exportación final.
 */
export async function drawBadge(
  ctx: CanvasRenderingContext2D,
  { displayName, photoImg }: { displayName: string; photoImg: HTMLImageElement | null },
): Promise<void> {
  const [logo, seal, wwbRaw] = await Promise.all([
    loadImage("/brand/equidata-logo-blanco.png"),
    loadImage("/brand/sello-originalidad.png"),
    loadImage("/brand/wwb-monocromatico.png"),
  ]);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Tarjeta (esquinas redondeadas 28px → esquinas transparentes en el PNG).
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, BASE_W, BASE_H, 28);
  ctx.clip();
  ctx.fillStyle = CARD;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // ── Abanicos de triángulos ────────────────────────────────────────────
  // Izquierda (punta a la derecha): [x, top, w, h, color]
  const leftTris: [number, number, number, number, string][] = [
    [56, 338, 92, 112, D_LIME],
    [36, 432, 116, 146, D_PURPLE],
    [74, 552, 82, 100, D_CORAL],
    [118, 392, 44, 56, D_DARK],
  ];
  for (const [x, top, w, h, color] of leftTris) {
    tri(ctx, x, top, x, top + h, x + w, top + h / 2, color);
  }
  // Derecha (punta a la izquierda): [right, top, w, h, color]
  const rightTris: [number, number, number, number, string][] = [
    [74, 344, 82, 100, D_CORAL],
    [36, 436, 116, 146, D_PURPLE],
    [56, 556, 92, 112, D_LIME],
    [118, 498, 44, 56, D_DARK],
  ];
  for (const [right, top, w, h, color] of rightTris) {
    const edge = BASE_W - right;
    tri(ctx, edge, top, edge, top + h, edge - w, top + h / 2, color);
  }

  // ── Marco de foto (300×300 centrado horizontalmente) ──────────────────
  const frameX = 180;
  const frameY = 322;
  const frameSize = 300;
  ctx.fillStyle = INNER;
  ctx.beginPath();
  ctx.roundRect(frameX, frameY, frameSize, frameSize, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(190,164,232,0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Foto (o iniciales) con inset de 10px dentro del marco.
  const inset = 10;
  const photoX = frameX + inset;
  const photoY = frameY + inset;
  const photoSize = frameSize - inset * 2;
  if (photoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(photoX, photoY, photoSize, photoSize, 4);
    ctx.clip();
    drawCover(ctx, photoImg, photoX, photoY, photoSize, photoSize);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.roundRect(photoX, photoY, photoSize, photoSize, 4);
    ctx.fill();
    ctx.font = "700 84px SpaceGrotesk";
    ctx.fillStyle = D_PURPLE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(displayName || "EQUIdata"), frameX + frameSize / 2, frameY + frameSize / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }

  // Esquinas de color del marco (arm 22px, grosor 2px).
  ctx.lineWidth = 2;
  ctx.lineCap = "butt";
  const arm = 22;
  const ticks: [number, number, number, number, string][] = [
    // [cornerX, cornerY, dirX, dirY, color]
    [170, 312, 1, 1, D_LIME], // sup. izq.
    [490, 312, -1, 1, D_CORAL], // sup. der.
    [170, 632, 1, -1, D_CORAL], // inf. izq.
    [490, 632, -1, -1, D_LIME], // inf. der.
  ];
  for (const [cx, cy, dx, dy, color] of ticks) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx + dx * arm, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * arm);
    ctx.stroke();
  }

  // ── Sello de originalidad (esquina sup. der.) ─────────────────────────
  const sealW = 130;
  const sealH = sealW * (seal.naturalHeight / seal.naturalWidth);
  ctx.drawImage(seal, BASE_W - 34 - sealW, 34, sealW, sealH);

  // ── Cabecera ──────────────────────────────────────────────────────────
  const left = 44;

  ctx.font = "400 14px SpaceMono";
  ctx.fillStyle = D_PURPLE;
  ctx.letterSpacing = "2.2px";
  ctx.fillText("HAGO PARTE DE", left, 52);
  ctx.letterSpacing = "0px";

  const logoW = 296;
  const logoH = logoW * (logo.naturalHeight / logo.naturalWidth);
  const logoY = 92;
  ctx.drawImage(logo, left - 6, logoY, logoW, logoH);

  // Pill "COHORTE 1"
  ctx.font = "400 12px SpaceMono";
  ctx.letterSpacing = "1.4px";
  const pillY = logoY + logoH + 16;
  const pillH = 28;
  const pillTextW = ctx.measureText(COHORT_LABEL).width;
  const pillW = pillTextW + 26;
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.beginPath();
  ctx.roundRect(left, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = "#c9cbe0";
  ctx.textBaseline = "middle";
  ctx.fillText(COHORT_LABEL, left + 13, pillY + pillH / 2 + 1);
  ctx.textBaseline = "top";
  ctx.letterSpacing = "0px";

  // Sublínea "8 SESIONES PARA APRENDER A ANALIZAR DATOS"
  const subY = pillY + pillH + 16;
  ctx.font = "400 13px SpaceMono";
  ctx.letterSpacing = "0.6px";
  ctx.fillStyle = "#eef0f7";
  ctx.fillText(SUB_A, left, subY);
  const subAW = ctx.measureText(SUB_A).width;
  ctx.fillStyle = D_LIME;
  ctx.fillText(SUB_B, left + subAW, subY);
  ctx.letterSpacing = "0px";

  // ── Pie ────────────────────────────────────────────────────────────────
  const nameSizeMax = 34;
  const nameTop = BASE_H - 40 - nameSizeMax;

  ctx.font = "400 12px SpaceMono";
  ctx.letterSpacing = "1.6px";
  ctx.fillStyle = D_PURPLE;
  ctx.fillText("PARTICIPANTE", left, nameTop - 23);
  ctx.letterSpacing = "0px";

  let nameSize = nameSizeMax;
  ctx.font = `700 ${nameSize}px SpaceGrotesk`;
  const nameMaxW = 400;
  while (ctx.measureText(displayName).width > nameMaxW && nameSize > 20) {
    nameSize -= 1;
    ctx.font = `700 ${nameSize}px SpaceGrotesk`;
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(displayName, left, nameTop + (nameSizeMax - nameSize));

  // Logo WWB (recoloreado a claro para el fondo oscuro), pie derecho.
  const wwbBoxW = 137;
  const wwbBoxH = 59;
  const wwbTinted = recolor(wwbRaw, wwbBoxW * 2, wwbBoxH * 2, "#d7dcec");
  ctx.drawImage(wwbTinted, 467, 725, wwbBoxW, wwbBoxH);

  ctx.restore();
}

/** Genera la insignia como PNG (Blob) — usado tanto para la vista previa como para la descarga final. */
export async function renderBadgeBlob({
  displayName,
  photoDataUrl,
}: {
  displayName: string;
  photoDataUrl: string | null;
}): Promise<Blob> {
  const [photoImg] = await Promise.all([
    photoDataUrl ? loadImage(photoDataUrl) : Promise.resolve(null),
    loadFonts(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo de la insignia.");
  ctx.scale(SCALE, SCALE);

  await drawBadge(ctx, { displayName, photoImg });

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("No se pudo generar la imagen de la insignia.");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
