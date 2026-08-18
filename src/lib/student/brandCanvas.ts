/**
 * Utilidades de dibujo en `<canvas>` compartidas por las imágenes descargables
 * de marca (certificado, insignia): carga de fuentes/assets, esquinas
 * decorativas rotadas, texto con tracking manual y ajuste de línea. Extraído
 * de `certificateImage.ts` para que la insignia reuse el mismo motor en vez
 * de duplicarlo.
 */

export const NAVY = "#12224F";
export const LIME = "#A9DB4E";
export const PURPLE = "#8C6FE0";
export const CORAL = "#F1573D";
export const BG = "#FAFAF8";
export const GRAY = "#6B7280";
export const INK_SOFT = "#4B5563";
export const HAIRLINE = "#DEDEE6";
export const HINT = "#9CA3AF";

const FONTS: { family: string; url: string; weight: string }[] = [
  { family: "SpaceGrotesk", url: "/fonts/SpaceGrotesk-Bold.ttf", weight: "700" },
  { family: "Inter", url: "/fonts/Inter-Regular.ttf", weight: "400" },
  { family: "Inter", url: "/fonts/Inter-SemiBold.ttf", weight: "600" },
  { family: "SpaceMono", url: "/fonts/SpaceMono-Regular.ttf", weight: "400" },
  { family: "SpaceMono", url: "/fonts/SpaceMono-Bold.ttf", weight: "700" },
];

export async function loadFonts(): Promise<void> {
  await Promise.all(
    FONTS.map(async (f) => {
      const font = new FontFace(f.family, `url(${f.url})`, { weight: f.weight });
      await font.load();
      document.fonts.add(font);
    }),
  );
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Cuadrado de lado `size` con esquinas redondeadas (radio `radius`), rotado
 * `angleDeg` sobre su propio centro, dividido en 4 triángulos de color.
 */
export function drawCornerDecoration(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  radius: number,
  angleDeg: number,
  colors: [string, string, string, string],
) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.translate(-size / 2, -size / 2);

  roundRectPath(ctx, 0, 0, size, size, radius);
  ctx.clip();

  const half = size / 2;
  const quads: [number, number, number, number, number, number, string][] = [
    [0, 0, half, 0, 0, half, colors[0]],
    [half, 0, size, 0, size, half, colors[1]],
    [0, half, 0, size, half, size, colors[2]],
    [size, half, size, size, half, size, colors[3]],
  ];
  for (const [x1, y1, x2, y2, x3, y3, color] of quads) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Dibuja `img` dentro de una caja respetando su proporción real (object-fit: contain), centrada. */
export function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const ar = img.naturalWidth / img.naturalHeight;
  let w = boxW;
  let h = boxW / ar;
  if (h > boxH) {
    h = boxH;
    w = boxH * ar;
  }
  ctx.drawImage(img, boxX + (boxW - w) / 2, boxY + (boxH - h) / 2, w, h);
}

/** Dibuja `img` llenando la caja por completo, recortando el sobrante (object-fit: cover), centrado. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const boxAr = boxW / boxH;
  const imgAr = img.naturalWidth / img.naturalHeight;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgAr > boxAr) {
    sh = img.naturalHeight;
    sw = sh * boxAr;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / boxAr;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, boxX, boxY, boxW, boxH);
}

/** Triángulo relleno — para las esquirlas decorativas de la insignia. */
export function fillTriangle(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  color: string,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Texto centrado con tracking manual (letter-spacing), como las etiquetas mono del diseño. */
export function fillTextTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  tracking: number,
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let x = cx - total / 2;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
