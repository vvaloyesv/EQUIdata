/**
 * Comprime una foto subida por el usuario antes de guardarla — para que
 * pese lo mínimo posible sin importar cuánto pese el archivo original
 * (una foto de celular moderna fácilmente pesa varios MB; un avatar nunca
 * necesita más que unos cuantos KB).
 */

import { loadImage } from "@/lib/student/brandCanvas";

const DEFAULT_MAX_DIM = 480;
const DEFAULT_QUALITY = 0.75;

/** Redimensiona (lado mayor ≤ maxDim, preserva proporción) y recodifica como JPEG a la calidad dada. */
export async function compressImage(
  file: File,
  { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY } = {},
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear el lienzo para comprimir la imagen.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("No se pudo comprimir la imagen.");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
