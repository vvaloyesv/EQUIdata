/**
 * YouTube solo permite embeberse en un iframe desde `/embed/VIDEO_ID` — una
 * URL normal de "ver" (`/watch?v=`) o de `youtu.be/` responde con
 * X-Frame-Options y el navegador rechaza la conexión. El profesor pega
 * cualquier link que copie de YouTube; esta función lo normaliza al formato
 * embebible. URLs que no sean de YouTube (u otro proveedor de video) se
 * devuelven sin tocar.
 */
export function toEmbedVideoUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.replace(/^(www|m)\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") return url;
  if (parsed.pathname.startsWith("/embed/")) return url;

  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = parsed.pathname.slice(1) || null;
  } else if (parsed.pathname === "/watch") {
    videoId = parsed.searchParams.get("v");
  } else if (parsed.pathname.startsWith("/shorts/")) {
    videoId = parsed.pathname.split("/")[2] ?? null;
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

/**
 * Id de un video de YouTube (cualquier formato que acepta `toEmbedVideoUrl`),
 * o null si la URL no es de YouTube. Lo usa el reproductor para mostrar la
 * miniatura antes de cargar el iframe (M10 · F5).
 */
export function youTubeIdOf(rawUrl: string): string | null {
  const embed = toEmbedVideoUrl(rawUrl);
  const match = embed.match(/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/);
  return match ? match[1] : null;
}

/**
 * URL del reproductor para cuando la persona pulsa "reproducir":
 * youtube-nocookie (no deja cookies de seguimiento hasta reproducir),
 * autoplay porque ya hubo un clic, y la API de JS habilitada para la futura
 * función de puntos clave en video (CLAUDE.md).
 */
export function youTubePlayerUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
}
